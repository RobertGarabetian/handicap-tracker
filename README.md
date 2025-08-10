# Golf Handicap Tracker

A modern web application that automatically calculates your golf handicap by uploading photos of your scorecards. Built with Next.js, TypeScript, Tesseract.js OCR, and Convex for data persistence.

## Features

- 📸 **Photo Upload**: Upload JPG/PNG images of golf scorecards
- 🔍 **OCR Processing**: Automatic text extraction using Tesseract.js with image preprocessing
- 📊 **Handicap Calculation**: Real-time differential and handicap index computation
- 💾 **Data Persistence**: All rounds stored in Convex database
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎯 **Demo Data**: Quick start with sample rounds

## Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **OCR**: Tesseract.js for client-side image processing
- **Backend**: Convex for database and server functions
- **Authentication**: Clerk (optional, ready for integration)
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd handicap-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev --configure
   ```
   This will:
   - Create a new Convex project
   - Add environment variables to `.env.local`
   - Set up the database schema

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Environment Variables

The following environment variables will be automatically added to `.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_deployment_name
```

## Usage

### Adding a Round

1. **Upload a scorecard photo** - Click "Choose File" and select a JPG or PNG image
2. **Extract data with OCR** - Click "Extract Data with OCR" to automatically parse the image
3. **Review and edit** - Check the extracted data and make any necessary corrections
4. **Save the round** - Click "Save Round" to store it in the database

### Manual Entry

You can also enter round data manually without uploading a photo:
1. Fill in the course name, rating, slope, and gross score
2. The differential will be calculated automatically
3. Click "Save Round"

### Demo Data

Click "Add Demo Data" to populate the app with sample rounds from famous golf courses.

### Clearing Data

Click "Clear My Data" to remove all stored rounds (requires confirmation).

## Handicap Calculation

The app follows USGA handicap calculation rules:

- **Differential Formula**: `((Gross - Course Rating) × 113) / Slope Rating`
- **Handicap Index**: 
  - < 8 rounds: Average of lowest 3 differentials
  - 8-19 rounds: Average of lowest ⌊n/2⌋ differentials (minimum 3)
  - ≥ 20 rounds: Average of lowest 8 of last 20 differentials

## OCR Processing

The app uses Tesseract.js for optical character recognition:

1. **Image Preprocessing**: Converts to grayscale and applies threshold
2. **Text Extraction**: Recognizes numbers and text from the image
3. **Pattern Matching**: Uses regex patterns to find:
   - Total/Gross score
   - Course Rating
   - Slope Rating
   - Course name (basic heuristic)

## Project Structure

```
handicap-tracker/
├── convex/                 # Convex backend
│   ├── schema.ts          # Database schema
│   └── rounds.ts          # Database functions
├── src/
│   ├── app/               # Next.js app router
│   │   ├── layout.tsx     # Root layout with Convex provider
│   │   └── page.tsx       # Main application page
│   └── lib/               # Utility functions
│       ├── convex.ts      # Convex client setup
│       ├── handicap.ts    # Handicap calculation utilities
│       └── ocr.ts         # OCR processing functions
└── public/                # Static assets
```

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variables from `.env.local`
   - Deploy

### Environment Variables for Production

Make sure to add these to your Vercel project:
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`

## Adding Authentication (Optional)

To add user authentication with Clerk:

1. **Install Clerk**
   ```bash
   npm install @clerk/nextjs
   ```

2. **Set up Clerk provider** in `layout.tsx`
3. **Update Convex functions** to use `userId` from Clerk
4. **Add environment variables** for Clerk

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Sample Scorecard

For testing OCR functionality, you can use any golf scorecard image. The app looks for:
- Total/Gross score (e.g., "Total: 85")
- Course Rating (e.g., "Course Rating: 72.8")
- Slope Rating (e.g., "Slope: 145")

## Troubleshooting

### OCR Issues
- Ensure the image is clear and well-lit
- Check that the scorecard text is readable
- Try adjusting the image quality or taking a new photo

### Convex Connection Issues
- Verify environment variables are set correctly
- Check that Convex deployment is running
- Ensure you're using the correct deployment URL

### Build Issues
- Clear `.next` folder and node_modules
- Run `npm install` again
- Check TypeScript errors in the console
# handicap-tracker
