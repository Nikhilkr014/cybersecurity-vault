# Xero

A premium full-stack cybersecurity vault web application featuring client-side AES-256-GCM encryption, secure user authentication, and high-fidelity interactive user interfaces.

## Key Features

- **Responsive Capsule Header**: A grid-aligned capsule navigation bar featuring spring sliding active item indicators (powered by Framer Motion) and integrated Log In/Sign Up buttons.
- **Interactive Cursor Spotlight**: A Vercel/Linear style cursor-tracking border spotlight glow on the landing card that follows mouse coordinates in real-time.
- **Dynamic SVG Animation Pipeline**: A 60fps data flow line animation connecting geometric nodes dynamically inside the hero card layout.
- **Aurora Authentication**: A custom, modern two-column registration page with staggered entrance transitions and specular frosted glass buttons.
- **Secure Cryptographic Vault**: A client-side cryptography dashboard enabling users to encrypt, store, and decrypt private notes using passphrase keys.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (v4), Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, JWT (JSON Web Tokens), bcryptjs, AES-256-GCM.

---

## Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone this repository to your local machine.
2. Install client dependencies at the root:
   ```bash
   npm install
   ```
3. Install server dependencies inside the `server/` directory:
   ```bash
   cd server
   npm install
   ```

### Running Locally

To run the application locally, start both the client and server development servers:

#### 1. Start the Backend Server (Port 5000)
```bash
cd server
npm run dev
```

#### 2. Start the Frontend Client (Vite Dev Server)
In a separate terminal at the root directory:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Building for Production

To compile and bundle the client-side code:
```bash
npm run build
```
The optimized assets will be outputted in the `dist/` directory.
