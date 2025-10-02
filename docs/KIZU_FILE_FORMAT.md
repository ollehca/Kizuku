# .kizu File Format Specification

Version: 1.0.0
Status: Draft
Last Updated: 2025-10-02

## Overview

The `.kizu` file format is a JSON-based container for Kizu design projects. It provides a portable, self-contained project format that includes design data, assets, metadata, and version information.

## Goals

- **Portability**: Projects work across different installations
- **Self-Contained**: Embed all assets (images, fonts) within the file
- **Version Compatibility**: Clear versioning for forward/backward compatibility
- **PenPot Compatible**: Can import/export PenPot project data
- **Human-Readable**: JSON format for debugging and inspection
- **Efficient**: Optional compression for large projects

## File Structure

### Basic Format

```json
{
  "version": "1.0.0",
  "type": "kizu-project",
  "metadata": {
    "id": "uuid-v4",
    "name": "Project Name",
    "description": "Optional description",
    "created": "2025-10-02T12:00:00Z",
    "modified": "2025-10-02T14:30:00Z",
    "author": {
      "name": "User Name",
      "email": "user@example.com"
    },
    "license": "private",
    "tags": ["web", "mobile", "design-system"]
  },
  "settings": {
    "canvas": {
      "width": 1920,
      "height": 1080,
      "backgroundColor": "#ffffff"
    },
    "grid": {
      "enabled": true,
      "size": 8,
      "color": "#e0e0e0"
    },
    "units": "px"
  },
  "data": {
    "pages": [],
    "components": [],
    "colorLibrary": [],
    "typographyLibrary": []
  },
  "assets": {
    "images": [],
    "fonts": [],
    "media": []
  },
  "history": {
    "enabled": true,
    "maxEntries": 100,
    "entries": []
  }
}
```

## Detailed Specification

### Version Field

```json
{
  "version": "1.0.0"
}
```

- **Format**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Required**: Yes
- **Purpose**: Determine compatibility and feature support

### Type Field

```json
{
  "type": "kizu-project"
}
```

- **Format**: String constant
- **Required**: Yes
- **Value**: Must be `"kizu-project"`
- **Purpose**: File type identification

### Metadata

```json
{
  "metadata": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "E-commerce Mobile App",
    "description": "Mobile app redesign for e-commerce platform",
    "created": "2025-10-01T10:00:00Z",
    "modified": "2025-10-02T15:45:30Z",
    "author": {
      "name": "Jane Designer",
      "email": "jane@example.com"
    },
    "license": "private",
    "tags": ["mobile", "e-commerce", "ios", "android"],
    "customData": {
      "clientName": "Acme Corp",
      "projectCode": "ACME-2025-001"
    }
  }
}
```

**Fields:**
- `id` (string, required): UUID v4 unique identifier
- `name` (string, required): Human-readable project name
- `description` (string, optional): Project description
- `created` (string, required): ISO 8601 timestamp
- `modified` (string, required): ISO 8601 timestamp
- `author` (object, optional): Creator information
- `license` (string, required): License type ("private" or "business")
- `tags` (array, optional): Searchable tags
- `customData` (object, optional): User-defined metadata

### Settings

```json
{
  "settings": {
    "canvas": {
      "width": 1920,
      "height": 1080,
      "backgroundColor": "#ffffff",
      "orientation": "landscape"
    },
    "grid": {
      "enabled": true,
      "size": 8,
      "color": "#e0e0e0",
      "opacity": 0.5
    },
    "guides": {
      "enabled": true,
      "horizontal": [100, 200, 300],
      "vertical": [100, 400, 800]
    },
    "units": "px",
    "colorSpace": "sRGB"
  }
}
```

**Fields:**
- `canvas`: Default canvas settings
- `grid`: Grid system configuration
- `guides`: Layout guides
- `units`: Measurement unit ("px", "pt", "mm", "in")
- `colorSpace`: Color space ("sRGB", "Display P3")

### Data - Pages

```json
{
  "data": {
    "pages": [
      {
        "id": "page-1",
        "name": "Homepage",
        "width": 1920,
        "height": 1080,
        "backgroundColor": "#ffffff",
        "layers": [
          {
            "id": "layer-1",
            "type": "rectangle",
            "name": "Background",
            "x": 0,
            "y": 0,
            "width": 1920,
            "height": 1080,
            "fill": "#f5f5f5",
            "stroke": null,
            "opacity": 1,
            "visible": true,
            "locked": false
          }
        ]
      }
    ]
  }
}
```

**Page Fields:**
- `id` (string): Unique page identifier
- `name` (string): Page name
- `width` (number): Page width
- `height` (number): Page height
- `backgroundColor` (string): Background color
- `layers` (array): Layer objects (rectangles, text, images, etc.)

### Data - Components

```json
{
  "data": {
    "components": [
      {
        "id": "component-1",
        "name": "Button Primary",
        "type": "component",
        "width": 120,
        "height": 40,
        "layers": [],
        "variants": [
          {
            "id": "variant-1",
            "name": "Default",
            "properties": { "state": "default" }
          },
          {
            "id": "variant-2",
            "name": "Hover",
            "properties": { "state": "hover" }
          }
        ]
      }
    ]
  }
}
```

**Component Fields:**
- `id` (string): Unique component identifier
- `name` (string): Component name
- `type` (string): "component"
- `layers` (array): Component layers
- `variants` (array): Component variants/states

### Data - Color Library

```json
{
  "data": {
    "colorLibrary": [
      {
        "id": "color-1",
        "name": "Primary Blue",
        "value": "#2563eb",
        "type": "solid",
        "usage": "primary"
      },
      {
        "id": "color-2",
        "name": "Gradient Background",
        "type": "gradient",
        "gradient": {
          "type": "linear",
          "angle": 45,
          "stops": [
            { "color": "#2563eb", "position": 0 },
            { "color": "#7c3aed", "position": 1 }
          ]
        }
      }
    ]
  }
}
```

### Data - Typography Library

```json
{
  "data": {
    "typographyLibrary": [
      {
        "id": "typo-1",
        "name": "Heading 1",
        "fontFamily": "Inter",
        "fontSize": 48,
        "fontWeight": 700,
        "lineHeight": 1.2,
        "letterSpacing": -0.5
      }
    ]
  }
}
```

### Assets

```json
{
  "assets": {
    "images": [
      {
        "id": "image-1",
        "name": "logo.png",
        "mimeType": "image/png",
        "width": 200,
        "height": 100,
        "size": 12345,
        "data": "base64-encoded-image-data",
        "thumbnail": "base64-encoded-thumbnail"
      }
    ],
    "fonts": [
      {
        "id": "font-1",
        "name": "Inter",
        "family": "Inter",
        "style": "Regular",
        "weight": 400,
        "format": "woff2",
        "data": "base64-encoded-font-data"
      }
    ],
    "media": [
      {
        "id": "media-1",
        "name": "video.mp4",
        "mimeType": "video/mp4",
        "size": 1234567,
        "duration": 10.5,
        "data": "base64-encoded-video-data"
      }
    ]
  }
}
```

**Asset Encoding:**
- Small assets (< 1MB): Embed as base64 in JSON
- Large assets (> 1MB): Store externally, reference by path
- Optional compression: Use gzip for JSON + assets

### History

```json
{
  "history": {
    "enabled": true,
    "maxEntries": 100,
    "entries": [
      {
        "id": "history-1",
        "timestamp": "2025-10-02T14:30:00Z",
        "action": "create-rectangle",
        "user": "jane@example.com",
        "data": {
          "layerId": "layer-1",
          "properties": { "x": 100, "y": 100 }
        }
      }
    ]
  }
}
```

## File Size Management

### Compression

Large projects should use compression:

```
project.kizu (uncompressed JSON)
project.kizu.gz (gzip compressed)
```

### External Assets

For very large projects, use external asset storage:

```json
{
  "assets": {
    "images": [
      {
        "id": "image-1",
        "name": "large-image.png",
        "mimeType": "image/png",
        "size": 5242880,
        "external": true,
        "path": "assets/image-1.png"
      }
    ]
  }
}
```

Project structure:
```
project.kizu          # Main project file
assets/
  image-1.png         # External image
  video-1.mp4         # External video
```

## Version Compatibility

### Semantic Versioning

- **MAJOR**: Breaking changes, incompatible with previous versions
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Version Detection

```javascript
const project = JSON.parse(fileContent);
const [major, minor, patch] = project.version.split('.').map(Number);

if (major !== 1) {
  throw new Error('Incompatible project version');
}

if (minor > currentMinor) {
  console.warn('Project created with newer version, some features may not work');
}
```

### Migration

```javascript
function migrateProject(project) {
  const version = project.version;

  if (version === '1.0.0') {
    // Project is current version
    return project;
  }

  // Apply migrations
  return project;
}
```

## PenPot Compatibility

### Import from PenPot

```javascript
async function importFromPenpot(penpotData) {
  return {
    version: '1.0.0',
    type: 'kizu-project',
    metadata: {
      id: generateUUID(),
      name: penpotData.name,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      license: 'private'
    },
    data: convertPenpotData(penpotData),
    assets: extractPenpotAssets(penpotData)
  };
}
```

### Export to PenPot

```javascript
async function exportToPenpot(kizuProject) {
  return {
    name: kizuProject.metadata.name,
    pages: convertKizuPages(kizuProject.data.pages),
    // ... PenPot format
  };
}
```

## Usage Examples

### Create New Project

```javascript
const project = {
  version: '1.0.0',
  type: 'kizu-project',
  metadata: {
    id: crypto.randomUUID(),
    name: 'New Project',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    license: 'private'
  },
  settings: {
    canvas: { width: 1920, height: 1080 },
    units: 'px'
  },
  data: {
    pages: [],
    components: [],
    colorLibrary: [],
    typographyLibrary: []
  },
  assets: {
    images: [],
    fonts: [],
    media: []
  },
  history: {
    enabled: true,
    maxEntries: 100,
    entries: []
  }
};

// Save to file
const json = JSON.stringify(project, null, 2);
await fs.writeFile('project.kizu', json);
```

### Load Project

```javascript
const fileContent = await fs.readFile('project.kizu', 'utf-8');
const project = JSON.parse(fileContent);

// Validate version
if (project.version !== '1.0.0') {
  project = migrateProject(project);
}

// Validate structure
if (project.type !== 'kizu-project') {
  throw new Error('Invalid project file');
}
```

## Security Considerations

### Validation

Always validate loaded projects:

```javascript
function validateProject(project) {
  if (!project.version || !project.type) {
    throw new Error('Invalid project structure');
  }

  if (project.type !== 'kizu-project') {
    throw new Error('Not a Kizu project');
  }

  // Validate metadata
  if (!project.metadata.id || !project.metadata.name) {
    throw new Error('Invalid project metadata');
  }

  return true;
}
```

### Sanitization

Sanitize user input when creating projects:

```javascript
function sanitizeMetadata(metadata) {
  return {
    ...metadata,
    name: sanitizeString(metadata.name),
    description: sanitizeString(metadata.description),
    tags: metadata.tags?.map(sanitizeString)
  };
}
```

## Future Extensions

### Version 1.1.0 (Planned)

- Collaboration metadata (multi-user editing)
- Animation timeline data
- Advanced export options
- Plugin data storage

### Version 2.0.0 (Future)

- Cloud sync metadata
- Real-time collaboration data
- Advanced version control
- Team permissions

## References

- [PenPot File Format](https://github.com/penpot/penpot)
- [JSON Schema](https://json-schema.org/)
- [UUID v4](https://tools.ietf.org/html/rfc4122)
- [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html)
