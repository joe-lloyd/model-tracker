# Mini Vault (Model Tracker)

A personal inventory application for tracking tabletop miniatures, including their build/paint status, categorization, and photos. Designed to be a simple, effective way to manage a collection ("pile of shame" vs. display case).

## Overview

This application serves as a digital vault for your models. It allows you to:

- **Record Models**: Add new models to your inventory with detailed metadata.
- **Track Progress**: Monitor status flags like Assembled, Primed, Painted, and Based.
- **Take Photos**: Associate images with your models (e.g., using Cloudinary).
- **Organize**: Use lists, filters (by System, Faction, Tags), and categories to manage your collection.
- **Sell Pile**: Mark items for sale to separate them from your active collection.

## Tech Stack

The project is a monorepo built with **TurboRepo** and **pnpm**.

- **Frontend (`apps/web`)**:
  - **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
  - **Language**: TypeScript
  - **Styling**: [Tailwind CSS](https://tailwindcss.com/)
  - **Routing**: [React Router](https://reactrouter.com/)
  - **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation
  - **UI**: Lucide React icons, clsx/tailwind-merge

- **Backend / Serverless (`functions`)**:
  - **Runtime**: Netlify Functions (Node.js)
  - **Utilities**: Shared logic for model retrieval and updates.

- **Shared (`packages/shared`)**:
  - Contains shared TypeScript interfaces and Zod schemas used by both frontend and backend.

## Project Structure

```
├── apps
│   └── web            # Main React application
│       ├── src
│       │   ├── components # UI components (ModelList, ModelForm, etc.)
│       │   ├── lib        # Utils (api client, constants)
│       │   └── ...
├── functions          # Serverless functions (API endpoints like get-models, submit-model)
├── packages
│   └── shared         # Shared code (Schema, Type definitions)
├── data               # Data storage (JSON based)
│   └── models.json    # The main database file
└── ...
```

## Data Structure (`data/models.json`)

The core data is stored in a JSON file at `data/models.json`. It is an array of `Model` objects.

### Model Schema

Defined in `packages/shared/src/schema.ts`, a typical entry looks like this:

```json
{
  "id": "uuid-string",
  "name": "Model Name",
  "system": "Game System (e.g., Warhammer 40k)",
  "faction": "Faction Name (e.g., Orks)",
  "manufacturer": "Manufacturer Name",
  "tags": ["Tag1", "Tag2"],
  "count": 1,
  "painted": true,
  "assembled": true,
  "primed": true,
  "based": true,
  "notes": "Optional notes...",
  "images": ["url-to-image.jpg"],
  "createdAt": "ISO-8601-date-string",
  "forSale": false
}
```

### Fields Breakdown

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the model entry. |
| `name` | String | Name of the unit or model. |
| `system` | String | The game system it belongs to (e.g., "Warhammer 40,000", "Marvel Crisis Protocol"). |
| `faction` | String | The army or faction (e.g., "Space Marines", "Avengers"). |
| `manufacturer` | String | (Optional) Who made the model (e.g., "Games Workshop"). |
| `tags` | `Array<String>` | Custom tags like "HQ", "Vehicle", "Plastic Crack", "Metal". |
| `count` | Number | Quantity of models in this entry (default 1). |
| `painted` | Boolean | Is the model fully painted? |
| `assembled` | Boolean | Is the model assembled? |
| `primed` | Boolean | Is the model primed? |
| `based` | Boolean | Is the base finished? |
| `forSale` | Boolean | Is this item marked for sale? |
| `notes` | String | (Optional) Free text for descriptions, loadouts, or missing parts. |
| `images` | `Array<String>` | List of image URLs associated with the model. |
| `createdAt` | ISO String | Timestamp of creation. |

## Quick Start

1. **Install Dependencies**:

    ```bash
    pnpm install
    ```

2. **Run Development Server**:
    This will start both the frontend and the Netlify functions locally.

    ```bash
    pnpm dev
    ```

3. **Build**:

    ```bash
    pnpm build
    ```

## Development Workflow

- **Adding Features**: modifying `apps/web` for UI changes.
- **Data Logic**: Update `functions` if you need to change how data is fetched or saved.
- **Schema Changes**: Update `packages/shared/src/schema.ts` first if changing the data model, as it is the source of truth for validation.
