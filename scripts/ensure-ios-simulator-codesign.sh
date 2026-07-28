#!/usr/bin/env bash
# Ensures a trusted local code-signing identity exists for iOS Simulator builds.
# Ad-hoc / linker-signed simulator apps hit Keychain errSecMissingEntitlement (-34018)
# for expo-secure-store and expo-notifications. A trusted non-ad-hoc signature fixes it
# without an Apple Developer account. Real device / EAS builds should use a real team cert.

set -euo pipefail

IDENTITY_NAME="${ONTRACK_SIM_CODESIGN_IDENTITY:-Apple Development: onTrack Local}"
CERT_DIR="${TMPDIR:-/tmp}/ontrack-sim-codesign"
P12_PASS="${ONTRACK_SIM_CODESIGN_P12_PASS:-ontrack}"

if security find-identity -p codesigning -v 2>/dev/null | grep -Fq "$IDENTITY_NAME"; then
  echo "Simulator codesign identity already present: $IDENTITY_NAME"
  exit 0
fi

echo "Creating simulator codesign identity: $IDENTITY_NAME"
rm -rf "$CERT_DIR"
mkdir -p "$CERT_DIR"

cat > "$CERT_DIR/codesign.cnf" <<EOF
[req]
distinguished_name = req_distinguished_name
prompt = no
x509_extensions = v3_codesign

[req_distinguished_name]
CN = $IDENTITY_NAME
OU = FAKETEAMID
O = onTrack
C = US

[v3_codesign]
basicConstraints = CA:FALSE
keyUsage = digitalSignature
extendedKeyUsage = codeSigning
EOF

/usr/bin/openssl req -x509 -newkey rsa:2048 -keyout "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" \
  -days 825 -nodes -config "$CERT_DIR/codesign.cnf" >/dev/null 2>&1

/usr/bin/openssl pkcs12 -export -out "$CERT_DIR/codesign.p12" -inkey "$CERT_DIR/key.pem" -in "$CERT_DIR/cert.pem" \
  -password "pass:$P12_PASS" -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1 >/dev/null 2>&1

LOGIN_KC="$HOME/Library/Keychains/login.keychain-db"
security import "$CERT_DIR/codesign.p12" -k "$LOGIN_KC" -P "$P12_PASS" -T /usr/bin/codesign -T /usr/bin/security >/dev/null
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "" "$LOGIN_KC" >/dev/null 2>&1 || true
security add-trusted-cert -r trustRoot -p codeSign "$CERT_DIR/cert.pem" >/dev/null 2>&1 || true

if ! security find-identity -p codesigning -v 2>/dev/null | grep -Fq "$IDENTITY_NAME"; then
  echo "Failed to install codesign identity: $IDENTITY_NAME" >&2
  security find-identity -p codesigning >&2 || true
  exit 1
fi

echo "Installed and trusted: $IDENTITY_NAME"
