# compactImg: Web-Based Image Compressor

A simple web application built with Next.js for uploading and compressing images using various settings, leveraging Vercel Blob for storage.

**Live Demo:** [https://compactimg-6hn8ippey-bradleys-projects-00671824.vercel.app/](https://compactimg-6hn8ippey-bradleys-projects-00671824.vercel.app/)

## Features

*   **Image Upload:** Drag-and-drop or browse to upload multiple image files.
*   **Compression Settings:** Adjust compression quality and potentially other format-specific settings (future enhancement).
*   **Real-time Feedback:** View upload progress and processing status for each image.
*   **Download Compressed Images:** Download the optimised versions of your images.
*   **Vercel Blob Integration:** Securely stores original and processed images using Vercel's Blob storage.

## Technology Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://react.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Storage:** [Vercel Blob](https://vercel.com/storage/blob)
*   **Deployment:** [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm, yarn, pnpm, or bun
*   A Vercel account with Blob storage enabled.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd compactImg
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Set up Environment Variables:**
    This project requires a Vercel Blob Read/Write token for storing uploaded images.
    *   Obtain your `BLOB_READ_WRITE_TOKEN` from your Vercel project's Storage tab.
    *   Create a file named `.env.local` in the root of the project.
    *   Add the following line to `.env.local`, replacing `your_actual_token_here` with your token:
        ```
        BLOB_READ_WRITE_TOKEN=your_actual_token_here
        ```
    *   **Important:** Ensure `.env.local` is added to your `.gitignore` file to prevent committing your secret token.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

The main page can be found at `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimising/fonts) to automatically optimise and load [Geist](https://vercel.com/font), a font family from Vercel.

## Usage

1.  **Upload Images:** Drag files onto the upload zone or click to browse and select images.
2.  **Configure Settings (Optional):** Once uploaded, each image will appear in a card. Adjust any available compression settings as needed.
3.  **Process:** Click the "Process" or "Compress" button for an image.
4.  **Download:** Once processing is complete, a download link for the compressed image will become available.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

**Before deploying, configure the `BLOB_READ_WRITE_TOKEN` environment variable in your Vercel project settings:**

1.  Go to your project on the Vercel dashboard.
2.  Navigate to the **Settings** tab.
3.  Click on **Environment Variables** in the left sidebar.
4.  Add a new variable:
    *   **Name:** `BLOB_READ_WRITE_TOKEN`
    *   **Value:** Paste the token you obtained from the Vercel Storage tab (the same one used in `.env.local`).
    *   **Environment(s):** Select Production, Preview, and Development (or as needed).
5.  Click **Save**.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
