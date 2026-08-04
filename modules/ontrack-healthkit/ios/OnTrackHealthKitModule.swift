import ExpoModulesCore
import Foundation
import HealthKit

private let onTrackEntryMetadataKey = "com.imtihoss.ontracknow.moodEntryId"

struct HealthAuthorizationOptions: Record {
  @Field var stateOfMindWrite: Bool = false
}

struct HealthQueryOptions: Record {
  @Field var startDate: String = ""
  @Field var endDate: String = ""
  @Field var timeZone: String = ""
}

struct StateOfMindQueryOptions: Record {
  @Field var startDate: String = ""
  @Field var endDate: String = ""
}

struct StateOfMindInput: Record {
  @Field var entryId: String = ""
  @Field var date: String = ""
  @Field var kind: String = "momentary"
  @Field var valence: Double = 0
  @Field var labels: [String] = []
  @Field var associations: [String] = []
}

public final class OnTrackHealthKitModule: Module {
  private let store = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("OnTrackHealthKit")

    AsyncFunction("isAvailableAsync") { HKHealthStore.isHealthDataAvailable() }
    AsyncFunction("isStateOfMindAvailableAsync") {
      if #available(iOS 18.0, *) { return HKHealthStore.isHealthDataAvailable() }
      return false
    }

    AsyncFunction("requestAuthorizationAsync") { (options: HealthAuthorizationOptions) async throws -> Bool in
      guard HKHealthStore.isHealthDataAvailable() else { return false }
      var read = self.readTypes()
      var share = Set<HKSampleType>()
      if #available(iOS 18.0, *) {
        let stateType = HKObjectType.stateOfMindType()
        read.insert(stateType)
        if options.stateOfMindWrite { share.insert(stateType) }
      }
      try await self.store.requestAuthorization(toShare: share, read: read)
      return true
    }

    AsyncFunction("queryHealthSummaryAsync") { (options: HealthQueryOptions) async throws -> [String: Any] in
      guard HKHealthStore.isHealthDataAvailable() else { throw HealthUnavailableError() }
      let start = try self.parseDate(options.startDate)
      let end = try self.parseDate(options.endDate)
      let zone = TimeZone(identifier: options.timeZone) ?? .current
      return try await self.querySummary(start: start, end: end, timeZone: zone)
    }

    AsyncFunction("queryStateOfMindAsync") { (options: StateOfMindQueryOptions) async throws -> [[String: Any]] in
      guard #available(iOS 18.0, *) else { return [] }
      return try await self.queryStateOfMind(start: self.parseDate(options.startDate), end: self.parseDate(options.endDate))
    }

    AsyncFunction("saveStateOfMindAsync") { (input: StateOfMindInput) async throws -> [String: Any] in
      guard #available(iOS 18.0, *) else { throw StateOfMindUnavailableError() }
      let sample = HKStateOfMind(
        date: try self.parseDate(input.date),
        kind: input.kind == "daily" ? .dailyMood : .momentaryEmotion,
        valence: min(1, max(-1, input.valence)),
        labels: input.labels.compactMap(self.stateLabel),
        associations: input.associations.compactMap(self.stateAssociation),
        metadata: [onTrackEntryMetadataKey: input.entryId]
      )
      try await self.store.save(sample)
      return ["uuid": sample.uuid.uuidString]
    }

    AsyncFunction("deleteOwnedStateOfMindAsync") { (uuid: String) async throws -> Void in
      guard #available(iOS 18.0, *), let objectId = UUID(uuidString: uuid) else { throw StateOfMindUnavailableError() }
      let samples = try await self.sampleQuery(type: HKObjectType.stateOfMindType(), predicate: HKQuery.predicateForObject(with: objectId), limit: 1, sort: nil)
      guard let sample = samples.first as? HKStateOfMind,
            sample.sourceRevision.source.bundleIdentifier == Bundle.main.bundleIdentifier,
            sample.metadata?[onTrackEntryMetadataKey] is String else { throw StateOfMindOwnershipError() }
      try await self.store.delete(sample)
    }
  }

  private func readTypes() -> Set<HKObjectType> {
    var types = Set<HKObjectType>([HKObjectType.workoutType()])
    let quantities: [HKQuantityTypeIdentifier] = [.stepCount, .activeEnergyBurned, .appleExerciseTime, .heartRate, .restingHeartRate]
    quantities.compactMap { HKObjectType.quantityType(forIdentifier: $0) }.forEach { types.insert($0) }
    if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(sleep) }
    return types
  }

  private func parseDate(_ value: String) throws -> Date {
    let withFraction = ISO8601DateFormatter()
    withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let parsed = withFraction.date(from: value) { return parsed }
    let basic = ISO8601DateFormatter()
    if let parsed = basic.date(from: value) { return parsed }
    throw InvalidHealthDateError()
  }

  private func querySummary(start: Date, end: Date, timeZone: TimeZone) async throws -> [String: Any] {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    var days: [String: [String: Any]] = [:]
    var cursor = calendar.startOfDay(for: start)
    while cursor < end {
      days[dateKey(cursor, calendar)] = ["dateKey": dateKey(cursor, calendar)]
      cursor = calendar.date(byAdding: .day, value: 1, to: cursor) ?? end
    }

    try await applyStatistics(.stepCount, options: .cumulativeSum, unit: .count(), fields: ["steps"], start: start, end: end, calendar: calendar, days: &days)
    try await applyStatistics(.activeEnergyBurned, options: .cumulativeSum, unit: .kilocalorie(), fields: ["activeEnergyKcal"], start: start, end: end, calendar: calendar, days: &days)
    try await applyStatistics(.appleExerciseTime, options: .cumulativeSum, unit: .minute(), fields: ["exerciseMinutes"], start: start, end: end, calendar: calendar, days: &days)
    try await applyStatistics(.heartRate, options: [.discreteAverage, .discreteMin, .discreteMax], unit: HKUnit.count().unitDivided(by: .minute()), fields: ["heartRateAverageBpm", "heartRateMinBpm", "heartRateMaxBpm"], start: start, end: end, calendar: calendar, days: &days)
    try await applyStatistics(.restingHeartRate, options: .discreteAverage, unit: HKUnit.count().unitDivided(by: .minute()), fields: ["restingHeartRateBpm"], start: start, end: end, calendar: calendar, days: &days)

    if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
      let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
      let samples = try await sampleQuery(type: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sort: nil)
      var intervals: [String: [(Date, Date)]] = [:]
      for case let sample as HKCategorySample in samples where isAsleep(sample.value) {
        var segmentStart = max(start, sample.startDate)
        let sampleEnd = min(end, sample.endDate)
        while segmentStart < sampleEnd {
          let dayStart = calendar.startOfDay(for: segmentStart)
          let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? sampleEnd
          let segmentEnd = min(dayEnd, sampleEnd)
          intervals[dateKey(dayStart, calendar), default: []].append((segmentStart, segmentEnd))
          segmentStart = segmentEnd
        }
      }
      for (key, values) in intervals {
        days[key]?["sleepMinutes"] = mergedDuration(values) / 60
      }
    }

    let workoutPredicate = HKQuery.predicateForSamples(withStart: start, end: end)
    let workoutSamples = try await sampleQuery(type: HKObjectType.workoutType(), predicate: workoutPredicate, limit: HKObjectQueryNoLimit, sort: NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false))
    let activeEnergyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)
    let workouts: [[String: Any]] = workoutSamples.compactMap { value in
      guard let workout = value as? HKWorkout else { return nil }
      var result: [String: Any] = [
        "id": workout.uuid.uuidString,
        "activityName": workoutName(workout.workoutActivityType),
        "startedAt": ISO8601DateFormatter().string(from: workout.startDate),
        "endedAt": ISO8601DateFormatter().string(from: workout.endDate),
        "durationMinutes": workout.duration / 60
      ]
      if let type = activeEnergyType, let energy = workout.statistics(for: type)?.sumQuantity()?.doubleValue(for: .kilocalorie()) {
        result["activeEnergyKcal"] = energy
      }
      return result
    }
    return ["daily": days.values.sorted { ($0["dateKey"] as? String ?? "") < ($1["dateKey"] as? String ?? "") }, "workouts": workouts]
  }

  private func applyStatistics(_ identifier: HKQuantityTypeIdentifier, options: HKStatisticsOptions, unit: HKUnit, fields: [String], start: Date, end: Date, calendar: Calendar, days: inout [String: [String: Any]]) async throws {
    guard let type = HKObjectType.quantityType(forIdentifier: identifier) else { return }
    let results = try await statistics(type: type, options: options, start: start, end: end, calendar: calendar)
    var updates: [String: [String: Double]] = [:]
    results.enumerateStatistics(from: start, to: end) { stats, _ in
      let key = self.dateKey(stats.startDate, calendar)
      if fields.count == 3 {
        if let value = stats.averageQuantity()?.doubleValue(for: unit) { updates[key, default: [:]][fields[0]] = value }
        if let value = stats.minimumQuantity()?.doubleValue(for: unit) { updates[key, default: [:]][fields[1]] = value }
        if let value = stats.maximumQuantity()?.doubleValue(for: unit) { updates[key, default: [:]][fields[2]] = value }
      } else if options.contains(.cumulativeSum), let value = stats.sumQuantity()?.doubleValue(for: unit) {
        updates[key, default: [:]][fields[0]] = value
      } else if let value = stats.averageQuantity()?.doubleValue(for: unit) {
        updates[key, default: [:]][fields[0]] = value
      }
    }
    for (key, values) in updates {
      for (field, value) in values {
        days[key]?[field] = value
      }
    }
  }

  private func statistics(type: HKQuantityType, options: HKStatisticsOptions, start: Date, end: Date, calendar: Calendar) async throws -> HKStatisticsCollection {
    try await withCheckedThrowingContinuation { continuation in
      let query = HKStatisticsCollectionQuery(quantityType: type, quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end), options: options, anchorDate: calendar.startOfDay(for: start), intervalComponents: DateComponents(day: 1))
      query.initialResultsHandler = { _, results, error in
        if let error { continuation.resume(throwing: error) }
        else if let results { continuation.resume(returning: results) }
        else { continuation.resume(throwing: EmptyHealthResultError()) }
      }
      store.execute(query)
    }
  }

  private func sampleQuery(type: HKSampleType, predicate: NSPredicate?, limit: Int, sort: NSSortDescriptor?) async throws -> [HKSample] {
    try await withCheckedThrowingContinuation { continuation in
      let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: limit, sortDescriptors: sort.map { [$0] }) { _, samples, error in
        if let error { continuation.resume(throwing: error) }
        else { continuation.resume(returning: samples ?? []) }
      }
      store.execute(query)
    }
  }

  @available(iOS 18.0, *)
  private func queryStateOfMind(start: Date, end: Date) async throws -> [[String: Any]] {
    let samples = try await sampleQuery(type: HKObjectType.stateOfMindType(), predicate: HKQuery.predicateForSamples(withStart: start, end: end), limit: HKObjectQueryNoLimit, sort: NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false))
    return samples.compactMap { value in
      guard let sample = value as? HKStateOfMind else { return nil }
      var result: [String: Any] = [
        "uuid": sample.uuid.uuidString,
        "date": ISO8601DateFormatter().string(from: sample.startDate),
        "kind": sample.kind == .dailyMood ? "daily" : "momentary",
        "valence": sample.valence,
        "labels": sample.labels.compactMap(stateLabelName),
        "associations": sample.associations.compactMap(stateAssociationName),
        "ownedByOnTrack": sample.sourceRevision.source.bundleIdentifier == Bundle.main.bundleIdentifier
      ]
      if let entryId = sample.metadata?[onTrackEntryMetadataKey] as? String { result["entryId"] = entryId }
      return result
    }
  }

  private func dateKey(_ date: Date, _ calendar: Calendar) -> String {
    let parts = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
  }

  private func isAsleep(_ value: Int) -> Bool {
    if #available(iOS 16.0, *) {
      return [HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue, HKCategoryValueSleepAnalysis.asleepCore.rawValue, HKCategoryValueSleepAnalysis.asleepDeep.rawValue, HKCategoryValueSleepAnalysis.asleepREM.rawValue].contains(value)
    }
    return value == HKCategoryValueSleepAnalysis.asleep.rawValue
  }

  private func mergedDuration(_ values: [(Date, Date)]) -> TimeInterval {
    let sorted = values.sorted { $0.0 < $1.0 }
    guard var current = sorted.first else { return 0 }
    var total: TimeInterval = 0
    for next in sorted.dropFirst() {
      if next.0 <= current.1 { current.1 = max(current.1, next.1) }
      else { total += current.1.timeIntervalSince(current.0); current = next }
    }
    return total + current.1.timeIntervalSince(current.0)
  }

  private func workoutName(_ type: HKWorkoutActivityType) -> String {
    switch type {
    case .walking: return "Walking"
    case .running: return "Running"
    case .cycling: return "Cycling"
    case .traditionalStrengthTraining, .functionalStrengthTraining: return "Strength Training"
    case .yoga: return "Yoga"
    case .swimming: return "Swimming"
    case .hiking: return "Hiking"
    case .highIntensityIntervalTraining: return "HIIT"
    case .mindAndBody: return "Mind and Body"
    default: return "Workout"
    }
  }

  @available(iOS 18.0, *)
  private func stateLabel(_ value: String) -> HKStateOfMind.Label? {
    switch value {
    case "happy": return .happy; case "sad": return .sad; case "angry": return .angry
    case "excited": return .excited; case "anxious": return .anxious; case "calm": return .calm
    case "stressed": return .stressed; case "frustrated": return .frustrated; case "lonely": return .lonely
    case "content": return .content; case "grateful": return .grateful; case "hopeful": return .hopeful
    case "overwhelmed": return .overwhelmed; default: return nil
    }
  }

  @available(iOS 18.0, *)
  private func stateLabelName(_ value: HKStateOfMind.Label) -> String? {
    switch value {
    case .happy: return "happy"; case .sad: return "sad"; case .angry: return "angry"
    case .excited: return "excited"; case .anxious: return "anxious"; case .calm: return "calm"
    case .stressed: return "stressed"; case .frustrated: return "frustrated"; case .lonely: return "lonely"
    case .content: return "content"; case .grateful: return "grateful"; case .hopeful: return "hopeful"
    case .overwhelmed: return "overwhelmed"; default: return nil
    }
  }

  @available(iOS 18.0, *)
  private func stateAssociation(_ value: String) -> HKStateOfMind.Association? {
    switch value {
    case "community": return .community; case "currentEvents": return .currentEvents; case "dating": return .dating
    case "education": return .education; case "family": return .family; case "fitness": return .fitness
    case "friends": return .friends; case "health": return .health; case "hobbies": return .hobbies
    case "identity": return .identity; case "money": return .money; case "partner": return .partner
    case "selfCare": return .selfCare; case "spirituality": return .spirituality; case "tasks": return .tasks
    case "travel": return .travel; case "work": return .work; case "weather": return .weather
    default: return nil
    }
  }

  @available(iOS 18.0, *)
  private func stateAssociationName(_ value: HKStateOfMind.Association) -> String? {
    switch value {
    case .community: return "community"; case .currentEvents: return "currentEvents"; case .dating: return "dating"
    case .education: return "education"; case .family: return "family"; case .fitness: return "fitness"
    case .friends: return "friends"; case .health: return "health"; case .hobbies: return "hobbies"
    case .identity: return "identity"; case .money: return "money"; case .partner: return "partner"
    case .selfCare: return "selfCare"; case .spirituality: return "spirituality"; case .tasks: return "tasks"
    case .travel: return "travel"; case .work: return "work"; case .weather: return "weather"
    @unknown default: return nil
    }
  }
}

private final class HealthUnavailableError: Exception, @unchecked Sendable { override var reason: String { "Apple Health is unavailable on this device." } }
private final class StateOfMindUnavailableError: Exception, @unchecked Sendable { override var reason: String { "Apple Health State of Mind requires iOS 18 or later." } }
private final class StateOfMindOwnershipError: Exception, @unchecked Sendable { override var reason: String { "Only State of Mind entries created by onTrack can be deleted." } }
private final class InvalidHealthDateError: Exception, @unchecked Sendable { override var reason: String { "The requested Health date range is invalid." } }
private final class EmptyHealthResultError: Exception, @unchecked Sendable { override var reason: String { "Apple Health returned no result." } }
