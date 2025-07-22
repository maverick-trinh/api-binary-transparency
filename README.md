# SuiNS Blob Fetcher API

This API resolves SuiNS names and fetches associated blob data from the Sui blockchain.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Running the Application

### Production mode:
```bash
npm start
```

### Development mode (with hot reload):
```bash
npm run dev
```

## API Usage

### Endpoint: `/api/fetch-blobs`

**Method:** GET  
**Query Parameters:**
- `name` (required): The SuiNS name to resolve (e.g., `walrus.sui`)

**Example:**
```bash
curl "http://localhost:3000/api/fetch-blobs?name=walrus.sui"
```

The API will:
1. Resolve the SuiNS name to get the owner's address
2. Find the Portal object owned by that address
3. Extract blob IDs from the Portal's dynamic fields
4. Fetch and decode all blob data
5. Return the decoded blob contents

## Configuration

The API is configured to connect to Sui testnet by default. To change the network, modify the `suiClient` initialization in `index.ts`:

```typescript
const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') }); // for mainnet
```

## Port Configuration

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8000 npm start
```
# api-binary-transparency
