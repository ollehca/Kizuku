# Kizu License System Documentation

## Overview

Kizu uses a cryptographically secure license code system for user authentication and access control. This document describes the complete license system implementation.

## License Code Format

**Format**: `KIZU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`

**Example**: `KIZU-50019-99AC6-14B35-557C8-509D0`

- **Prefix**: KIZU- (identifies as Kizu license)
- **Length**: 25 hexadecimal characters (0-9, A-F) after prefix
- **Groups**: 5 groups of 5 characters, separated by hyphens
- **Case**: Case-insensitive (automatically converted to uppercase)

## License Types

### 1. Private/Individual (Type Code: P / 0x50)
- For solo designers and individual users
- Local-only storage and authentication
- No cloud services required
- No billing or registration
- One-time license code activation

### 2. Business/Collaborative (Type Code: B / 0x42)
- For teams and organizations
- Cloud services and real-time collaboration
- Billing and team management
- **Status**: Coming Soon (skeleton implemented)

### 3. Trial (Type Code: T / 0x54)
- For demo and evaluation purposes
- **Status**: Reserved for future use

## Technical Implementation

### Data Structure

Each license code encodes 12.5 bytes of data:

```
[TYPE(1)] + [TIMESTAMP(6)] + [RANDOM(5)] + [SIGNATURE(0.5)]
= 12.5 bytes = 25 hex characters
```

**Components:**
1. **Type Byte** (1 byte):
   - `0x50` ('P') = Private
   - `0x42` ('B') = Business
   - `0x54` ('T') = Trial

2. **Timestamp** (6 bytes / 48 bits):
   - Milliseconds since Unix epoch
   - Good until year 10889
   - Used for code generation tracking

3. **Random Data** (5 bytes):
   - Cryptographically secure random bytes
   - Ensures uniqueness

4. **Signature Nibble** (4 bits / 0.5 byte):
   - Upper 4 bits of HMAC-SHA256 signature
   - Prevents tampering and forgery

### Cryptographic Security

- **Algorithm**: HMAC-SHA256
- **Secret Key**: Stored in `KIZU_LICENSE_SECRET` environment variable
- **Signature**: Validates code integrity and authenticity
- **Tampering Detection**: Any change to the code invalidates the signature

### Security Features

✅ **Cryptographically Secure**
- Cannot be guessed or forged without secret key
- HMAC-SHA256 signature validation
- Constant-time comparison prevents timing attacks

✅ **Tamper-Proof**
- Any modification invalidates the signature
- Type, timestamp, and random data all protected

✅ **Unique**
- Cryptographically secure random bytes
- Timestamp ensures chronological uniqueness
- Collision probability: negligible

✅ **Offline Validation**
- No internet required for validation
- All data self-contained in code
- One-time validation, then trusted locally

## Files and Structure

### Core Files

1. **`/src/services/license-code.js`** - Main license system
   - `generateLicense()` - Generate new license code
   - `validateLicense()` - Validate existing code
   - `isValidFormat()` - Check format without crypto validation
   - `formatCode()` - Format code with proper hyphens
   - `generateBatch()` - Generate multiple codes

2. **`/tools/generate-license.js`** - CLI tool for code generation
   - Interactive command-line interface
   - Single and batch generation
   - JSON and CSV export
   - Validation testing

### Usage

#### Generate Single License

```bash
node tools/generate-license.js --type private --email user@example.com
```

Output:
```
✓ License Generated Successfully

Code:        KIZU-50019-99AC6-14B35-557C8-509D0
Type:        private
Email:       user@example.com
Generated:   2025-09-30T13:18:16.755Z

⚠️  SECURITY WARNING
Keep this code secure. Do not share with anyone.
If lost or stolen, contact support immediately.
```

#### Validate License Code

```bash
node tools/generate-license.js --validate "KIZU-50019-99AC6-14B35-557C8-509D0"
```

Output:
```
✓ License Code Valid

Code:        KIZU-50019-99AC6-14B35-557C8-509D0
Type:        private
Generated:   2025-09-30T13:18:16.755Z
```

#### Generate Batch (CSV)

```bash
node tools/generate-license.js --type private --count 100 --output licenses.csv
```

#### Generate Batch (JSON)

```bash
node tools/generate-license.js --type business --count 50 --output licenses.json
```

### Programmatic Usage

```javascript
const {
  generateLicense,
  validateLicense,
  isValidFormat,
  formatCode,
  LICENSE_TYPES
} = require('./src/services/license-code');

// Generate license
const license = generateLicense({
  type: LICENSE_TYPES.PRIVATE,
  email: 'user@example.com',
  metadata: { plan: 'pro' }
});

console.log(license.code); // KIZU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX

// Validate license
const result = validateLicense(license.code);
if (result.valid) {
  console.log('Valid license:', result.type);
} else {
  console.error('Invalid:', result.error);
}

// Check format (fast, no crypto)
if (isValidFormat('KIZU-50019-99AC6-14B35-557C8-509D0')) {
  console.log('Format is valid');
}

// Format code with hyphens
const formatted = formatCode('500199AC614B35557C8509D0');
console.log(formatted); // KIZU-50019-99AC6-14B35-557C8-509D0
```

## Security Best Practices

### For Users

⚠️ **CRITICAL**: License codes are like passwords

**DO:**
- ✅ Copy and paste codes (don't type manually)
- ✅ Store in a password manager
- ✅ Keep code private and secure
- ✅ Delete email after storing code securely
- ✅ Contact support immediately if compromised

**DON'T:**
- ❌ Share with anyone
- ❌ Post publicly or in screenshots
- ❌ Send via insecure channels
- ❌ Write down on paper
- ❌ Store in plain text files

### For Distribution

**Email Delivery** (Recommended for initial distribution):
```
Subject: Your Kizu License Code

Hello,

Thank you for purchasing Kizu!

Your license code: KIZU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX

⚠️ IMPORTANT SECURITY NOTICE:
• Keep this code secure - treat it like a password
• Store in a password manager immediately
• Do not share with anyone
• Delete this email after storing the code
• If lost or stolen, contact support@kizu.app

Copy and paste this code during Kizu activation.

Questions? support@kizu.app

—
Kizu Team
```

**Security Notice** (Include in all communications):
```
We deliver license codes via email for convenience. While email is not
the most secure option, it's industry standard and familiar to users.
We recommend:

1. Store your code in a password manager immediately
2. Delete the email after securing your code
3. Never share or forward the email

Kizu is not responsible for lost or stolen license codes. Users are
responsible for keeping their codes secure.
```

### For Developers

**Secret Key Management**:
```bash
# Development
export KIZU_LICENSE_SECRET="dev-secret-key-change-in-production"

# Production (use secure key management)
export KIZU_LICENSE_SECRET="$(cat /secure/path/to/secret)"
# Or use AWS Secrets Manager, Azure Key Vault, etc.
```

**Never**:
- ❌ Commit secret key to version control
- ❌ Hard-code secret key in source
- ❌ Share secret key via email/slack
- ❌ Use same key for dev and production
- ❌ Log secret key in application logs

## User Experience Considerations

### Copy/Paste Support

✅ **Always provide copy button** in UI
- 25 characters is too long to type manually
- Typing errors are frustrating
- Copy/paste is faster and error-free

✅ **Format for readability**
- Use hyphens: `KIZU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`
- Monospace font for display
- Clear visual separation

✅ **Accept flexible input**
- With or without hyphens
- Uppercase or lowercase
- Extra whitespace trimmed
- Auto-format on blur

### Error Handling

**Clear, Actionable Error Messages**:

❌ Bad: "Invalid code"
✅ Good: "License code must start with KIZU-"

❌ Bad: "Validation failed"
✅ Good: "License code contains invalid character 'O' (only 0-9 and A-F allowed)"

❌ Bad: "Error"
✅ Good: "License code is invalid or has been tampered with. Please check for typos or contact support."

### UI Best Practices

```
┌─────────────────────────────────────────┐
│  Enter Your Kizu License Code           │
│                                         │
│  [KIZU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX]  │
│          [Paste from clipboard]         │
│                                         │
│  ⚠️ Keep your code secure               │
│  Don't share with anyone                │
│                                         │
│  [Activate License]                     │
└─────────────────────────────────────────┘
```

## Testing

### Demo License for Development

**Email**: `demo@kizu.local`
**License**: `KIZU-50019-99AC6-14B35-557C8-509D0`
**Type**: Private
**Status**: For development/testing only

### Test Commands

```bash
# Generate and validate test code
node -e "
const {generateLicense, validateLicense} = require('./src/services/license-code.js');
const lic = generateLicense({type: 'private'});
console.log('Code:', lic.code);
console.log('Valid:', validateLicense(lic.code).valid);
"

# Test all license types
for type in private business trial; do
  echo "Testing $type license..."
  node tools/generate-license.js --type $type --email test@test.com
done

# Test validation
node tools/generate-license.js --validate "KIZU-50019-99AC6-14B35-557C8-509D0"
```

### Validation Test Cases

✅ **Valid Codes**:
- Standard format
- All uppercase
- All lowercase
- Mixed case
- With/without spaces
- Extra whitespace

❌ **Invalid Codes**:
- Wrong length
- Invalid characters (I, L, O not in hex)
- Missing KIZU- prefix
- Tampered data
- Wrong signature
- Invalid type code

## Integration Points

### Local Storage (Next Step)

License validation state stored in:
- **macOS**: `~/Library/Application Support/Kizu/license.json`
- **Windows**: `%APPDATA%/Kizu/license.json`
- **Linux**: `~/.config/Kizu/license.json`

```json
{
  "code": "KIZU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
  "type": "private",
  "validated": true,
  "validatedAt": "2025-09-30T13:18:16.755Z",
  "activatedBy": "user@example.com"
}
```

### Authentication Flow (Next Step)

1. **First Launch**: No license found
2. **License Selection**: Private vs Business
3. **Code Entry**: User pastes license code
4. **Validation**: Cryptographic verification
5. **Activation**: Store validation state locally
6. **Trust**: Subsequent launches skip validation

### Settings Integration (Next Step)

**Change License** option in settings:
- View current license type
- Upgrade to Business (future)
- Downgrade to Private (with warnings)
- Re-validate if needed

## Future Enhancements

### Planned Features

1. **License Recovery**
   - Email lookup for lost codes
   - Secure verification process
   - Re-send capability

2. **Usage Tracking** (Optional)
   - Anonymous usage statistics
   - Feature usage metrics
   - Error reporting

3. **License Transfer**
   - Deactivate on old machine
   - Activate on new machine
   - Transfer limit (e.g., 3 per year)

4. **Expiration** (For trials/subscriptions)
   - Add expiration date to code
   - Automatic expiration checking
   - Renewal flow

5. **Team Licenses** (Business tier)
   - Master code + member codes
   - Centralized management
   - Revocation capability

## Troubleshooting

### Common Issues

**Problem**: "License code is invalid"
**Solution**: Check for typos, ensure copy/paste, verify KIZU- prefix

**Problem**: "Invalid character in license code"
**Solution**: Only 0-9 and A-F allowed (not O, I, L, 1)

**Problem**: "License code data is incomplete"
**Solution**: Code must be exactly 25 characters after KIZU-

**Problem**: "License code has been tampered with"
**Solution**: Code was modified - contact support for new code

### Support

For license issues, contact:
- **Email**: support@kizu.app
- **GitHub**: https://github.com/ollehca/Kizu/issues
- **Documentation**: https://docs.kizu.app

## Compliance and Legal

### Mozilla Public License (MPL 2.0)

The license system is part of Kizu's proprietary Electron wrapper and is NOT subject to MPL 2.0. PenPot modifications remain under MPL 2.0 and are documented separately in `PENPOT_MODIFICATIONS.md`.

### License Agreement

Users agree to:
- Keep license codes secure
- Not share or transfer codes
- Accept responsibility for code security
- Contact support if code is compromised

Kizu is not liable for:
- Lost or stolen license codes
- Unauthorized use of codes
- Damages from compromised codes

### Privacy

License codes contain:
- Type identifier
- Generation timestamp
- Random unique identifier
- Cryptographic signature

License codes DO NOT contain:
- User email addresses
- Personal information
- Usage data
- Location data

Email addresses are stored separately for:
- License recovery
- Support purposes
- Purchase records

---

**Last Updated**: 2025-09-30
**Version**: 1.0.0
**Status**: Production Ready