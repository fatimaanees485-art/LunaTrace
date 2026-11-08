# LunaTrace · Lunar Landing Site Navigator 🌕🚀

**LunaTrace** is an interactive mission-planning and terrain analysis platform designed for evaluating lunar landing sites, solar illumination profiles, direct-to-Earth communication links, and rover traverse mobility corridors—focused primarily on the lunar South Pole and candidates for NASA's Artemis program.

---

## 🌟 Key Features

### 1. 🌐 Interactive 3D Lunar & South Pole Explorer
- **Realistic Three.js 3D Moon**: Interactive orbit controls, geographic coordinate grid (lat/lon), and lunar polar projection view.
- **Multispectral & Topographic Dataset Overlays**:
  - **LOLA Topography & Elevation**: Elevation shading from LOLA laser altimetry.
  - **Slope & Terrain Hazard Analysis**: Steepness detection indicating safe landing zones (<10°) vs hazard zones (>15° tilt limits).
  - **Permanently Shadowed Regions (PSRs)**: Cold-trap detection identifying deep crater beds that never receive sunlight.
  - **Volatiles & Water Ice Probability**: Neutron spectrometer volatile detections in cryogenic regions.
  - **Mean Solar Illumination**: Long-term lighting heatmaps showing illuminated ridge peaks.
- **Dynamic Orbital Lighting**: Real-time sun angle and lighting direction synchronized with the mission ephemeris timeline.

### 2. ☀️ Local Horizon & Sky Dome Visualization
- **Topocentric Sky Dome**: Real-time azimuthal polar plot displaying the local horizon, instantaneous Sun position, and Earth line-of-sight (LOS).
- **Subsolar & Sub-Earth Ephemeris Engine**:
  - Solar elevation, azimuth angle, and solar flux intensity ($W/m^2$).
  - Earth elevation, azimuth angle, and direct radio link margin ($dB$).
  - Simultaneous power generation and communication window assessments.
- **Thermal & Battery Limits**: Calculates continuous darkness duration to evaluate battery reserve constraints.

### 3. ⚖️ Site Trade-Off & Candidate Comparison Matrix
- Comparative scorecard evaluating Artemis candidates:
  - *Connecting Ridge*
  - *Shackleton Crater Rim*
  - *Malapert Mountain Peak*
  - *Faustini Crater Rim A*
  - *Haworth Crater Rim*
  - *De Gerlache Rim 2*
  - *Nobile Rim 1 & Peak*
  - *Amundsen Crater Rim*
  - *Apollo 11 Historical Touchdown (Equatorial Benchmark)*
- Compares solar illumination percentage, Earth direct visibility, slope roughness, and proximity to cold traps.

### 4. 🚜 Rover Traverse Route Planner
- **Multi-Station Route Mapping**: Plan traverse waypoints from touchdown coordinates to high-priority scientific sampling stations.
- **Elevation Cross-Section & Gradient Profile**: Dynamic SVG elevation profile highlighting route steepness.
- **Safety Ceiling Enforcement**: Real-time warnings when slope gradients exceed rover tilt boundaries ($15^\circ$).
- **Cryogenic Shadow Ingress Tracking**: Monitored ingress into Permanently Shadowed Regions (PSRs) to ensure battery life and thermal survival.

### 5. ⏱️ Mission Timeline Scrubber & Ephemeris Simulator
- **Interactive Scrubber**: Scrub through mission time from launch date to 14–30+ days.
- **Automated Playback**: Real-time simulation of lunar diurnal cycles and Earth orbital nodding (libration).
- **Concurrent Window Calculation**: Identifies golden windows of concurrent sunlight + direct-to-Earth communication.

### 6. 📁 Google Drive Lunar Mission Workspace
- **Google Workspace OAuth 2.0 Integration**: Authenticate securely using official Google Sign-In with in-memory token security.
- **Dedicated Cloud Folder**: Automatically organizes exports inside a `LunaTrace Mission Data` folder in your Google Drive.
- **Direct Cloud Archival**:
  - **Save Mission Assessment Package (JSON)**: Complete telemetry and feasibility dossier saved to Drive.
  - **Save Ephemeris Dataset (CSV)**: Raw ephemeris values uploaded directly to Drive.
  - **Save Rover Traverse Itineraries**: Archive multi-station waypoints and slope profiles for team collaboration.
- **Drive Mission Browser & Previewer**: Browse saved files, preview content within the app, open files directly in Google Drive, or delete files with explicit safety confirmations.

### 7. 🎯 Custom Coordinate Evaluator
- Input any arbitrary lunar coordinates (Latitude: $-90^\circ$ to $+90^\circ$, Longitude: $-180^\circ$ to $+180^\circ$) to analyze terrain elevation, slope, and ephemeris feasibility.

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **3D Graphics & Rendering**: [Three.js](https://threejs.org/) (`@types/three`)
- **Styling & Layout**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Cloud & Workspace Integrations**:
  - **Firebase Authentication** (`firebase/auth`)
  - **Google Drive API v3** (REST multipart upload, file querying, preview, and management)
- **Mathematical Modeling**: Lunar ephemeris calculations, topocentric transformation algorithms, and LOLA slope analysis approximations.

---

## 📂 Project Structure

```text
├── index.html                           # App entry point with typography & SEO metadata
├── firebase-applet-config.json          # Firebase project configuration for Google Auth
├── src/
│   ├── main.tsx                         # React root mount
│   ├── App.tsx                          # Core application shell & navigation manager
│   ├── index.css                        # Tailwind v4 styles and aerospace design tokens
│   ├── types/
│   │   └── lunar.ts                     # TypeScript definitions for sites, ephemeris, and waypoints
│   ├── data/
│   │   └── lunarSites.ts                # Artemis candidate landing sites & baseline telemetry
│   ├── utils/
│   │   ├── lunarMath.ts                 # Solar/Earth ephemeris mathematics & window analysis
│   │   └── slopeAnalysis.ts             # LOLA elevation interpolator and terrain slope safety
│   ├── services/
│   │   ├── firebaseAuth.ts              # Firebase auth setup, scopes, and in-memory token cache
│   │   └── googleDriveService.ts        # Google Drive v3 REST API (folders, multipart upload, list, delete)
│   ├── context/
│   │   └── GoogleAuthContext.tsx        # React context managing authentication state
│   └── components/
│       ├── Navbar.tsx                   # Top navigation bar with Google Drive status
│       ├── LunarGlobe.tsx               # Three.js 3D lunar sphere with layer filters
│       ├── LocalHorizonView.tsx         # Topocentric horizon sky dome & instrument telemetry
│       ├── RoverTraversePlanner.tsx     # Traverse waypoint mapper & Drive export
│       ├── SiteComparisonModal.tsx      # Multi-candidate comparison matrix
│       ├── TimelineController.tsx       # Bottom scrubber & playback controller
│       ├── ReportExportModal.tsx        # Mission assessment briefing & cloud/local export
│       ├── GoogleDriveModal.tsx         # Google Drive lunar workspace manager
│       ├── GoogleSignInButton.tsx       # Official Google Sign-In button component
│       ├── CustomCoordinateModal.tsx    # Custom landing site coordinate evaluator
│       └── ChallengeInfoModal.tsx       # NASA Space Apps Challenge objectives
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd react-example

# Install dependencies
npm install
```

### Running Locally
```bash
# Start the Vite development server
npm run dev
```
Open your browser at `http://localhost:3000`.

### Building for Production
```bash
# Type check and build bundle
npm run build

# Preview build locally
npm run preview
```

---

## 🔐 Google Drive Configuration & Scopes

The application utilizes Google Workspace OAuth 2.0 with the following permissions:
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.metadata`

> **Note**: In compliance with security standards, the OAuth access token is maintained strictly in memory and is automatically invalidated upon user sign-out.

---

## 🛰️ NASA Space Apps Challenge Alignment

LunaTrace addresses the challenges of lunar landing site selection:
1. **Lighting & Power**: Maximizing solar panel exposure on elevated crater ridges.
2. **Communications**: Sustaining continuous Direct-to-Earth (DTE) radio links without relying solely on relay orbiters.
3. **Terrain Hazards**: Identifying safe touchdown locations with slopes $< 10^\circ$.
4. **Scientific Value**: Balancing landing safety with rover traverse proximity to water-ice-bearing Permanently Shadowed Regions (PSRs).

---

## 📄 License
MIT License. Built for lunar exploration enthusiasts, researchers, and mission architects.
