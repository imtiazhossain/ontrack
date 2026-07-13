import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Input, Screen, SectionHeader } from '@/components/primitives';
import { CategoryBadge } from '@/components/shared';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { aiProvider } from '@/services/ai';
import { getMovieDetails, searchMovies, type MovieSearchResult } from '@/services/movies';
import { usePreferences } from '@/store/preferences';
import { newId, useSchedule } from '@/store/schedule';
import type {
  ActivityStatus,
  FoodItem,
  Meal,
  MealType,
  Movie,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutType,
  WorkSession,
  WorkTask,
} from '@/types/models';
import { todayKey } from '@/utils/date';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout'];
const WORKOUT_TYPES: WorkoutType[] = ['strength', 'cardio', 'mobility', 'custom'];
const PRIORITIES: WorkTask['priority'][] = ['low', 'medium', 'high'];

function formatDateForInput(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  return year && month && day ? `${month}/${day}/${year}` : dateKey;
}

function parseDateInput(value: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;

  const [, month, day, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) return undefined;

  return `${year}-${month}-${day}`;
}

const ASSISTANT_COPY: Record<string, { question: string; label: string; placeholder: string }> = {
  food: { question: 'What are we eating? Give me the delicious details. 🍴', label: 'Meal', placeholder: 'Breakfast, sushi night…' },
  gym: { question: 'What are we training today? Let’s get it on the books. 💪', label: 'Workout', placeholder: 'Leg day, morning run…' },
  work: { question: 'What are we getting done? Future you says thanks. ✨', label: 'Focus', placeholder: 'Deep work, team planning…' },
  sleep: { question: 'When are we heading to dreamland? 🌙', label: 'Sleep plan', placeholder: 'Early night, power nap…' },
  water: { question: 'How are we staying hydrated? 💧', label: 'Hydration', placeholder: 'Morning water, refill bottle…' },
  personal: { question: 'What are we making time for?', label: 'Plan', placeholder: 'Call Mom, creative time…' },
  mindfulness: { question: 'How are we finding a little calm? 🌿', label: 'Practice', placeholder: 'Meditation, breathing break…' },
  learning: { question: 'What are we curious about today? 📚', label: 'Learning', placeholder: 'Spanish lesson, read chapter 3…' },
  appointment: { question: 'Who are we meeting, and what for?', label: 'Appointment', placeholder: 'Dentist, coffee with Alex…' },
  habit: { question: 'Which tiny win are we keeping alive? 🌟', label: 'Habit', placeholder: 'Stretch, journal…' },
};

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function cloneMeal(meal: Meal | undefined, activityId: string, title: string): Meal {
  return meal
    ? { ...meal, items: meal.items.map((item) => ({ ...item })) }
    : { activityId, mealType: 'lunch', name: title, items: [] };
}

function cloneWorkout(workout: Workout | undefined, activityId: string, title: string): Workout {
  return workout
    ? {
        ...workout,
        exercises: workout.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => ({ ...set })),
        })),
      }
    : { activityId, type: 'custom', name: title, exercises: [] };
}

function cloneWorkSession(session: WorkSession | undefined, activityId: string): WorkSession {
  return session
    ? { ...session, tasks: session.tasks.map((task) => ({ ...task })) }
    : { activityId, tasks: [], focusMinutes: 0 };
}

function cloneMovie(movie: Movie | undefined, activityId: string): Movie | undefined {
  return movie ? { ...movie, activityId, genres: [...movie.genres] } : undefined;
}

export default function ActivityFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ date?: string; id?: string }>();
  const editId = typeof params.id === 'string' ? params.id : undefined;
  const aiEnabled = usePreferences((state) => state.aiEnabled);

  const categories = useSchedule((state) => state.categories);
  const existing = useSchedule((state) => state.activities.find((activity) => activity.id === editId));
  const storedMeal = useSchedule((state) => state.meals.find((meal) => meal.activityId === editId));
  const storedWorkout = useSchedule((state) => state.workouts.find((workout) => workout.activityId === editId));
  const storedWorkSession = useSchedule((state) =>
    state.workSessions.find((session) => session.activityId === editId),
  );
  const storedMovie = useSchedule((state) => state.movies.find((movie) => movie.activityId === editId));
  const saveEvent = useSchedule((state) => state.saveEvent);
  const deleteActivity = useSchedule((state) => state.deleteActivity);

  const initialId = editId ?? 'draft';
  const initialDate = existing?.date ?? (typeof params.date === 'string' ? params.date : todayKey());
  const [title, setTitle] = useState(existing?.title ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [date, setDate] = useState(() => formatDateForInput(initialDate));
  const [startHour, setStartHour] = useState(String(existing ? Math.floor(existing.startMinutes / 60) : 9));
  const [startMinute, setStartMinute] = useState(String(existing ? existing.startMinutes % 60 : 0));
  const [duration, setDuration] = useState(String(existing?.durationMinutes ?? 60));
  const status: ActivityStatus = existing?.status ?? 'upcoming';
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [photo, setPhoto] = useState<string | number | undefined>(existing?.photo);
  const [meal, setMeal] = useState(() => cloneMeal(storedMeal, initialId, existing?.title ?? ''));
  const [workout, setWorkout] = useState(() => cloneWorkout(storedWorkout, initialId, existing?.title ?? ''));
  const [workSession, setWorkSession] = useState(() => cloneWorkSession(storedWorkSession, initialId));
  const [movie, setMovie] = useState(() => cloneMovie(storedMovie, initialId));
  const [error, setError] = useState<string>();
  const [analyzing, setAnalyzing] = useState(false);

  const category = categories.find((item) => item.id === categoryId) ?? (editId ? categories[0] : undefined);
  const isEditing = Boolean(editId && existing);
  const missingActivity = Boolean(editId && !existing);
  const allowLeave = useRef(false);

  const signature = JSON.stringify({
    title,
    categoryId,
    date,
    startHour,
    startMinute,
    duration,
    notes,
    photo,
    meal,
    workout,
    workSession,
    movie,
  });
  const [initialSignature] = useState(signature);
  const dirty = signature !== initialSignature;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeave.current || !dirty) return;
      event.preventDefault();
      Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            allowLeave.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [dirty, navigation]);

  const startMinutes = useMemo(() => {
    const hours = Math.min(23, Math.max(0, numberValue(startHour)));
    const minutes = Math.min(59, Math.max(0, numberValue(startMinute)));
    return hours * 60 + minutes;
  }, [startHour, startMinute]);

  const startTimeValue = useMemo(() => {
    const value = new Date(2000, 0, 1);
    value.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    return value;
  }, [startMinutes]);

  const pickPhoto = async () => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is required to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]?.uri) setPhoto(result.assets[0].uri);
  };

  const analyzePhoto = async () => {
    if (typeof photo !== 'string') return;
    setAnalyzing(true);
    setError(undefined);
    try {
      const analysis = await aiProvider.analyzeMealPhoto({ photoUri: photo, mealName: title });
      setMeal((current) => ({
        ...current,
        name: current.name || title,
        photo,
        aiAnalysis: analysis,
        items: analysis.items,
      }));
    } catch {
      setError('Meal analysis failed. You can try again or edit items manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  const addFoodItem = () =>
    setMeal((current) => ({
      ...current,
      items: [
        ...current.items,
        { id: newId('food'), name: '', portion: '', calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      ],
    }));

  const updateFoodItem = (id: string, patch: Partial<FoodItem>) =>
    setMeal((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));

  const addExercise = () =>
    setWorkout((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        { id: newId('exercise'), name: '', icon: 'figure.strengthtraining.traditional', sets: [], restSeconds: 60 },
      ],
    }));

  const updateExercise = (id: string, patch: Partial<WorkoutExercise>) =>
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === id ? { ...exercise, ...patch } : exercise,
      ),
    }));

  const addSet = (exerciseId: string) => {
    const set: WorkoutSet = { id: newId('set'), reps: 10, weightKg: 0, done: false };
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, set] } : exercise,
      ),
    }));
  };

  const updateSet = (exerciseId: string, setId: string, patch: Partial<WorkoutSet>) =>
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)) }
          : exercise,
      ),
    }));

  const removeSet = (exerciseId: string, setId: string) =>
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) }
          : exercise,
      ),
    }));

  const addTask = () =>
    setWorkSession((current) => ({
      ...current,
      tasks: [...current.tasks, { id: newId('task'), title: '', done: false, priority: 'medium' }],
    }));

  const updateTask = (id: string, patch: Partial<WorkTask>) =>
    setWorkSession((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }));

  const save = () => {
    setError(undefined);
    if (!title.trim()) return setError('Title is required.');
    const dateKey = parseDateInput(date);
    if (!dateKey) return setError('Date must use MM/DD/YYYY.');
    if (!category) return setError('Choose an event type.');
    if (Number(duration) < 5 || !Number.isFinite(Number(duration))) {
      return setError('Duration must be at least 5 minutes.');
    }
    if (category.detailKind === 'food' && meal.items.some((item) => !item.name.trim())) {
      return setError('Every food item needs a name.');
    }
    if (category.detailKind === 'gym' && workout.exercises.some((item) => !item.name.trim())) {
      return setError('Every exercise needs a name.');
    }
    if (category.detailKind === 'work' && workSession.tasks.some((item) => !item.title.trim())) {
      return setError('Every task needs a title.');
    }
    if (category.detailKind === 'movie' && !movie) return setError('Search for and select a movie.');

    const totalCalories = meal.items.reduce((sum, item) => sum + item.calories, 0);
    const summary =
      category.detailKind === 'food'
        ? `${totalCalories} kcal · ${meal.items.length} item${meal.items.length === 1 ? '' : 's'}`
        : category.detailKind === 'gym'
          ? `${title.trim()} · ${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'}`
          : category.detailKind === 'work'
            ? `${workSession.tasks.length} task${workSession.tasks.length === 1 ? '' : 's'}`
            : category.detailKind === 'movie' && movie
              ? [movie.mediaType === 'tv' ? 'TV' : 'Movie', movie.releaseDate?.slice(0, 4), movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : undefined]
                  .filter(Boolean)
                  .join(' · ')
            : existing?.summary;

    saveEvent({
      id: editId,
      detailKind: category.detailKind,
      activity: {
        date: dateKey,
        title: title.trim(),
        categoryId,
        startMinutes,
        durationMinutes: Number(duration),
        status,
        notes: notes.trim() || undefined,
        photo: category.supportsPhotos ? photo : undefined,
        summary,
      },
      meal:
        category.detailKind === 'food'
          ? { ...meal, activityId: editId ?? savedDraftId, name: title.trim(), photo }
          : undefined,
      workout:
        category.detailKind === 'gym'
          ? { ...workout, activityId: editId ?? savedDraftId, name: title.trim() }
          : undefined,
      workSession:
        category.detailKind === 'work' ? { ...workSession, activityId: editId ?? savedDraftId } : undefined,
      movie:
        category.detailKind === 'movie' && movie
          ? { ...movie, activityId: editId ?? savedDraftId }
          : undefined,
    });
    allowLeave.current = true;
    router.back();
  };

  const savedDraftId = initialId;

  const editorTitle =
    category?.detailKind === 'food'
      ? 'Edit meal'
      : category?.detailKind === 'gym'
        ? 'Edit workout'
        : category?.detailKind === 'work'
          ? 'Edit work session'
          : category?.detailKind === 'movie'
            ? 'Edit movie'
          : 'Edit event';

  const confirmDelete = () => {
    if (!editId || !existing) return;
    Alert.alert('Delete event', `Remove “${existing.title}” from your schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteActivity(editId);
          allowLeave.current = true;
          router.back();
        },
      },
    ]);
  };

  if (missingActivity) {
    return (
      <Screen>
        <IconButton icon="chevron.left" accessibilityLabel="Go back" background="transparent" onPress={() => router.back()} />
        <AppText variant="title">Event not found</AppText>
        <AppText variant="body" color="secondary">This event may have been deleted.</AppText>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="xmark" accessibilityLabel="Cancel editing" background="transparent" onPress={() => router.back()} />
        <AppText variant="title">{isEditing ? editorTitle : 'Add event'}</AppText>
      </View>

      {!isEditing ? (
        <View style={[styles.assistantCard, { backgroundColor: theme.backgroundSunken, borderColor: theme.separator }]}>
          <View style={styles.assistantHeading}>
            <View style={[styles.assistantDot, { backgroundColor: theme.accentPrimary }]} />
            <AppText variant="overline" color="accent">onTrack assistant</AppText>
          </View>
          <AppText variant="title">What are we getting into?</AppText>
          <AppText variant="body" color="secondary">Pick a vibe and I’ll help with the rest.</AppText>
          <View style={styles.wrap}>
            {categories.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: item.id === categoryId }}
                onPress={() => {
                  setCategoryId(item.id);
                  setTitle('');
                  setMovie(undefined);
                  setError(undefined);
                }}
                style={[styles.chip, { borderColor: item.id === categoryId ? theme.accentPrimary : theme.separator, backgroundColor: item.id === categoryId ? theme.accentFaint : theme.backgroundSunken }]}>
                <CategoryBadge category={item} />
              </Pressable>
            ))}
          </View>
          {category ? (
            <View style={[styles.followUp, { borderTopColor: theme.separator }]}>
              <AppText variant="bodyMedium">
                {category.detailKind === 'movie'
                  ? 'Ooh, screen time. What are we watching? 🍿'
                  : ASSISTANT_COPY[category.id]?.question ?? 'What should we call it?'}
              </AppText>
              {category.detailKind === 'movie' ? (
                <MovieEditor
                  movie={movie}
                  guided
                  onSelect={(selected) => {
                    setMovie({ ...selected, activityId: editId ?? savedDraftId });
                    setTitle(selected.title);
                    if (selected.runtimeMinutes) setDuration(String(selected.runtimeMinutes));
                  }}
                />
              ) : (
                <Input
                  key={category.id}
                  label={ASSISTANT_COPY[category.id]?.label ?? 'Event'}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={ASSISTANT_COPY[category.id]?.placeholder ?? 'What’s happening?'}
                  autoFocus
                  returnKeyType="next"
                />
              )}
            </View>
          ) : null}
        </View>
      ) : null}

      {isEditing && category ? (
        <>
          <CategoryBadge category={category} />
          <Input label="Title" value={title} onChangeText={setTitle} placeholder="Event title" />
        </>
      ) : null}

      {category ? (
      <>
      <SectionHeader title="Schedule" />
      <View style={styles.twoColumns}>
        <View style={styles.flex}><Input label="Date" value={date} onChangeText={setDate} placeholder="MM/DD/YYYY" /></View>
        <View style={styles.flex}><Input label="Duration (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" /></View>
      </View>
      <View style={styles.timeSection}>
        <AppText variant="overline" color="tertiary">Start time</AppText>
        {Platform.OS === 'web' ? (
          <View style={styles.twoColumns}>
            <View style={styles.flex}><Input label="Hour" value={startHour} onChangeText={setStartHour} keyboardType="number-pad" /></View>
            <View style={styles.flex}><Input label="Minute" value={startMinute} onChangeText={setStartMinute} keyboardType="number-pad" /></View>
          </View>
        ) : (
          <DateTimePicker
            value={startTimeValue}
            mode="time"
            display="spinner"
            locale="en_US"
            accentColor={theme.accentPrimary}
            style={styles.timePicker}
            onValueChange={(_event, value) => {
              setStartHour(String(value.getHours()));
              setStartMinute(String(value.getMinutes()));
            }}
          />
        )}
      </View>

      <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional context" multiline style={styles.multiline} />

      {category?.supportsPhotos ? (
        <>
          <SectionHeader title="Photo" />
          {photo ? <Image source={photo} style={styles.photo} contentFit="cover" /> : null}
          <View style={styles.twoColumns}>
            <Button variant="secondary" onPress={pickPhoto} style={styles.flex} accessibilityLabel="Choose photo">{photo ? 'Replace photo' : 'Choose photo'}</Button>
            {photo ? <Button variant="ghost" onPress={() => setPhoto(undefined)} style={styles.flex} accessibilityLabel="Remove photo">Remove</Button> : null}
          </View>
        </>
      ) : null}

      {category?.detailKind === 'food' ? (
        <FoodEditor
          meal={meal}
          setMeal={setMeal}
          updateItem={updateFoodItem}
          addItem={addFoodItem}
          removeItem={(id) => setMeal((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }))}
          canAnalyze={aiEnabled && typeof photo === 'string'}
          analyzing={analyzing}
          onAnalyze={analyzePhoto}
        />
      ) : null}
      {category?.detailKind === 'gym' ? (
        <WorkoutEditor
          workout={workout}
          setWorkout={setWorkout}
          updateExercise={updateExercise}
          addExercise={addExercise}
          addSet={addSet}
          updateSet={updateSet}
          removeSet={removeSet}
        />
      ) : null}
      {category?.detailKind === 'work' ? (
        <WorkEditor session={workSession} setSession={setWorkSession} updateTask={updateTask} addTask={addTask} />
      ) : null}
      {isEditing && category?.detailKind === 'movie' ? (
        <MovieEditor
          movie={movie}
          onSelect={(selected) => {
            setMovie({ ...selected, activityId: editId ?? savedDraftId });
            setTitle(selected.title);
            if (selected.runtimeMinutes) setDuration(String(selected.runtimeMinutes));
          }}
        />
      ) : null}

      {error ? <AppText variant="callout" color="danger">{error}</AppText> : null}
      <View style={styles.actions}>
        <Button onPress={save} disabled={!title.trim()} accessibilityLabel="Save event">Save</Button>
        <Button variant="ghost" onPress={() => router.back()} accessibilityLabel="Cancel">Cancel</Button>
        {isEditing ? <Button variant="danger" onPress={confirmDelete} accessibilityLabel="Delete event">Delete event</Button> : null}
      </View>
      </>
      ) : null}
    </Screen>
  );
}

function ChoiceRow<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (value: T) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.choiceSection}>
      <AppText variant="overline" color="tertiary">{label}</AppText>
      <View style={styles.wrap}>
        {options.map((option) => (
          <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: option === value }} onPress={() => onChange(option)} style={[styles.choice, { borderColor: option === value ? theme.accentPrimary : theme.separator, backgroundColor: option === value ? theme.accentFaint : theme.backgroundSunken }]}>
            <AppText variant="caption">{option.replace('-', ' ')}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FoodEditor({ meal, setMeal, updateItem, addItem, removeItem, canAnalyze, analyzing, onAnalyze }: { meal: Meal; setMeal: React.Dispatch<React.SetStateAction<Meal>>; updateItem: (id: string, patch: Partial<FoodItem>) => void; addItem: () => void; removeItem: (id: string) => void; canAnalyze: boolean; analyzing: boolean; onAnalyze: () => void }) {
  return (
    <View>
      <SectionHeader title="Meal details" />
      <ChoiceRow label="Meal type" options={MEAL_TYPES} value={meal.mealType} onChange={(mealType) => setMeal((current) => ({ ...current, mealType }))} />
      <View style={styles.twoColumns}>
        <View style={styles.flex}><Input label="Hunger before (1–5)" value={meal.hungerBefore === undefined ? '' : String(meal.hungerBefore)} onChangeText={(value) => setMeal((current) => ({ ...current, hungerBefore: value ? Math.min(5, numberValue(value)) : undefined }))} keyboardType="number-pad" /></View>
        <View style={styles.flex}><Input label="Fullness after (1–5)" value={meal.fullnessAfter === undefined ? '' : String(meal.fullnessAfter)} onChangeText={(value) => setMeal((current) => ({ ...current, fullnessAfter: value ? Math.min(5, numberValue(value)) : undefined }))} keyboardType="number-pad" /></View>
      </View>
      {canAnalyze ? <Button variant="secondary" onPress={onAnalyze} disabled={analyzing} accessibilityLabel="Analyze meal photo">{analyzing ? 'Analyzing…' : 'Analyze photo with AI'}</Button> : null}
      {analyzing ? <ActivityIndicator style={styles.loader} /> : null}
      <SectionHeader title="Food items" actionLabel="Add item" onAction={addItem} />
      {meal.items.map((item) => (
        <View key={item.id} style={styles.nestedCard}>
          <Input label="Item" value={item.name} onChangeText={(name) => updateItem(item.id, { name })} placeholder="Food item" />
          <Input label="Portion" value={item.portion} onChangeText={(portion) => updateItem(item.id, { portion })} placeholder="1 cup" />
          <View style={styles.metricGrid}>
            {(['calories', 'proteinG', 'carbsG', 'fatG'] as const).map((field) => (
              <View key={field} style={styles.metricInput}><Input label={field === 'calories' ? 'Calories' : field.replace('G', ' (g)')} value={String(item[field])} onChangeText={(value) => updateItem(item.id, { [field]: numberValue(value) })} keyboardType="decimal-pad" /></View>
            ))}
          </View>
          <Button variant="ghost" onPress={() => removeItem(item.id)} accessibilityLabel={`Remove ${item.name || 'food item'}`}>Remove item</Button>
        </View>
      ))}
    </View>
  );
}

function WorkoutEditor({ workout, setWorkout, updateExercise, addExercise, addSet, updateSet, removeSet }: { workout: Workout; setWorkout: React.Dispatch<React.SetStateAction<Workout>>; updateExercise: (id: string, patch: Partial<WorkoutExercise>) => void; addExercise: () => void; addSet: (id: string) => void; updateSet: (exerciseId: string, setId: string, patch: Partial<WorkoutSet>) => void; removeSet: (exerciseId: string, setId: string) => void }) {
  return (
    <View>
      <SectionHeader title="Workout details" />
      <ChoiceRow label="Workout type" options={WORKOUT_TYPES} value={workout.type} onChange={(type) => setWorkout((current) => ({ ...current, type }))} />
      <SectionHeader title="Exercises" actionLabel="Add exercise" onAction={addExercise} />
      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.nestedCard}>
          <Input label="Exercise" value={exercise.name} onChangeText={(name) => updateExercise(exercise.id, { name })} placeholder="Exercise name" />
          <Input label="Rest (seconds)" value={String(exercise.restSeconds)} onChangeText={(value) => updateExercise(exercise.id, { restSeconds: numberValue(value) })} keyboardType="number-pad" />
          <Input label="Exercise notes" value={exercise.note ?? ''} onChangeText={(note) => updateExercise(exercise.id, { note })} />
          {exercise.sets.map((set, index) => (
            <View key={set.id} style={styles.setRow}>
              <AppText variant="caption">Set {index + 1}</AppText>
              <View style={styles.setInput}><Input label="Reps" value={String(set.reps)} onChangeText={(value) => updateSet(exercise.id, set.id, { reps: numberValue(value) })} keyboardType="number-pad" /></View>
              <View style={styles.setInput}><Input label="Weight kg" value={String(set.weightKg)} onChangeText={(value) => updateSet(exercise.id, set.id, { weightKg: numberValue(value) })} keyboardType="decimal-pad" /></View>
              <IconButton icon="trash" accessibilityLabel={`Remove set ${index + 1}`} onPress={() => removeSet(exercise.id, set.id)} />
            </View>
          ))}
          <Button variant="secondary" onPress={() => addSet(exercise.id)} accessibilityLabel={`Add set to ${exercise.name || 'exercise'}`}>Add set</Button>
          <Button variant="ghost" onPress={() => setWorkout((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== exercise.id) }))} accessibilityLabel={`Remove ${exercise.name || 'exercise'}`}>Remove exercise</Button>
        </View>
      ))}
    </View>
  );
}

function WorkEditor({ session, setSession, updateTask, addTask }: { session: WorkSession; setSession: React.Dispatch<React.SetStateAction<WorkSession>>; updateTask: (id: string, patch: Partial<WorkTask>) => void; addTask: () => void }) {
  return (
    <View>
      <SectionHeader title="Work session" />
      <Input label="Focus minutes" value={String(session.focusMinutes)} onChangeText={(value) => setSession((current) => ({ ...current, focusMinutes: numberValue(value) }))} keyboardType="number-pad" />
      <SectionHeader title="Tasks" actionLabel="Add task" onAction={addTask} />
      {session.tasks.map((task) => (
        <View key={task.id} style={styles.nestedCard}>
          <Input label="Task" value={task.title} onChangeText={(title) => updateTask(task.id, { title })} placeholder="Task title" />
          <ChoiceRow label="Priority" options={PRIORITIES} value={task.priority} onChange={(priority) => updateTask(task.id, { priority })} />
          <Input label="Estimate (minutes)" value={task.estimateMinutes === undefined ? '' : String(task.estimateMinutes)} onChangeText={(value) => updateTask(task.id, { estimateMinutes: value ? numberValue(value) : undefined })} keyboardType="number-pad" />
          <Button variant={task.done ? 'secondary' : 'ghost'} onPress={() => updateTask(task.id, { done: !task.done })} accessibilityLabel={`${task.done ? 'Mark incomplete' : 'Mark complete'} ${task.title || 'task'}`}>{task.done ? 'Completed' : 'Mark complete'}</Button>
          <Button variant="ghost" onPress={() => setSession((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))} accessibilityLabel={`Remove ${task.title || 'task'}`}>Remove task</Button>
        </View>
      ))}
    </View>
  );
}

function MovieEditor({ movie, onSelect, guided = false }: { movie?: Movie; onSelect: (movie: Omit<Movie, 'activityId'>) => void; guided?: boolean }) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectingId, setSelectingId] = useState<string>();
  const [searchError, setSearchError] = useState<string>();
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(undefined);
      try {
        const response = await searchMovies(normalized, controller.signal);
        setResults(response.results);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setResults([]);
        setSearchError(error instanceof Error ? error.message : 'Movie search failed.');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, retryKey]);

  const selectMovie = async (result: MovieSearchResult) => {
    const controller = new AbortController();
    const resultKey = `${result.mediaType}-${result.tmdbId}`;
    setSelectingId(resultKey);
    setSearchError(undefined);
    try {
      const details = await getMovieDetails(result.tmdbId, result.mediaType, controller.signal);
      onSelect(details);
      setQuery('');
      setResults([]);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to load movie details.');
    } finally {
      setSelectingId(undefined);
    }
  };

  return (
    <View>
      {!guided ? <SectionHeader title="Movie details" /> : null}
      {movie ? (
        <View style={[styles.movieSelected, { backgroundColor: theme.backgroundSunken, borderColor: theme.separator }]}>
          {movie.posterUrl ? <Image source={movie.posterUrl} style={styles.moviePoster} contentFit="cover" /> : null}
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{movie.title}</AppText>
            <AppText variant="caption" color="secondary">
              {[movie.mediaType === 'tv' ? 'TV show' : 'Movie', movie.releaseDate?.slice(0, 4), movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : undefined, movie.genres.join(', ') || undefined].filter(Boolean).join(' · ')}
            </AppText>
            {movie.overview ? <AppText variant="caption" color="secondary" numberOfLines={3}>{movie.overview}</AppText> : null}
          </View>
        </View>
      ) : null}
      <Input
        label={movie ? 'Find something else' : guided ? 'Movie or TV show' : 'Search movies & TV'}
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          if (value.trim().length < 2) {
            setResults([]);
            setSearchError(undefined);
            setSearching(false);
          }
        }}
        placeholder="Try Dune, The Bear, Severance…"
        autoCapitalize="words"
        autoFocus={guided}
        returnKeyType="search"
      />
      {searching ? <ActivityIndicator style={styles.loader} /> : null}
      {searchError ? (
        <View style={styles.searchMessage}>
          <AppText variant="callout" color="danger">{searchError}</AppText>
          <Button variant="secondary" onPress={() => setRetryKey((value) => value + 1)}>Try again</Button>
        </View>
      ) : null}
      {!searching && !searchError && query.trim().length >= 2 && results.length === 0 ? (
        <AppText variant="callout" color="secondary">No movies or shows found.</AppText>
      ) : null}
      {results.map((result) => (
        <Pressable
          key={`${result.mediaType}-${result.tmdbId}`}
          accessibilityRole="button"
          accessibilityLabel={`Select ${result.title}`}
          disabled={selectingId !== undefined}
          onPress={() => selectMovie(result)}
          style={[styles.movieResult, { borderColor: theme.separator }]}>
          {result.posterUrl ? <Image source={result.posterUrl} style={styles.resultPoster} contentFit="cover" /> : <View style={[styles.resultPoster, { backgroundColor: theme.backgroundSunken }]} />}
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{result.title}</AppText>
            <AppText variant="caption" color="secondary">
              {result.mediaType === 'tv' ? 'TV show' : 'Movie'}{result.releaseDate ? ` · ${result.releaseDate.slice(0, 4)}` : ''}
            </AppText>
            {result.overview ? <AppText variant="caption" color="secondary" numberOfLines={2}>{result.overview}</AppText> : null}
          </View>
          {selectingId === `${result.mediaType}-${result.tmdbId}` ? <ActivityIndicator /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  choiceSection: { gap: spacing.sm },
  choice: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  twoColumns: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeSection: { gap: spacing.sm },
  timePicker: { width: '100%', height: 180 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  photo: { width: '100%', height: 220, borderRadius: radii.lg },
  nestedCard: { gap: spacing.md, padding: spacing.md, borderRadius: radii.lg },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricInput: { width: '47%' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setInput: { flex: 1 },
  loader: { padding: spacing.md },
  actions: { gap: spacing.sm, paddingTop: spacing.md },
  movieSelected: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.md },
  moviePoster: { width: 88, height: 132, borderRadius: radii.md },
  movieResult: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  resultPoster: { width: 50, height: 75, borderRadius: radii.sm },
  searchMessage: { gap: spacing.sm },
  assistantCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1 },
  assistantHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  assistantDot: { width: 8, height: 8, borderRadius: radii.pill },
  followUp: { gap: spacing.md, borderTopWidth: 1, paddingTop: spacing.lg, marginTop: spacing.xs },
});
