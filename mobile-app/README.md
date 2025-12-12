# Smart QR Scanner (React Native)

This project is a React Native port of the Smart QR Scanner web application. It uses **Expo** and **TypeScript**.

## Prerequisites

*   Node.js (LTS version recommended)
*   npm or yarn
*   Expo CLI (optional, can use `npx`)

## Getting Started

1.  Navigate to the project directory:
    ```bash
    cd mobile-app
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the application:
    ```bash
    npx expo start
    ```

4.  Use the **Expo Go** app on your Android or iOS device to scan the QR code displayed in the terminal.

## Features

*   **Fast Scanning**: Uses native camera API for high-performance scanning.
*   **Flashlight Support**: Toggle flashlight for low-light conditions.
*   **Camera Switch**: Switch between front and back cameras.
*   **Scan from Image**: Pick an image from the gallery to scan (uses `expo-barcode-scanner`).
*   **History**: Saves your scan history locally.
*   **Smart Actions**: Automatically detects URLs, Emails, Phone numbers, WiFi, etc., and provides relevant actions.
*   **Dark/Light Mode**: Supports theming.

## Project Structure

*   `App.tsx`: Main application entry point and logic.
*   `src/utils/`: Utility functions for storage and parsing.
*   `assets/`: Icons and splash screens (placeholders).

## Note on Dependencies

This app relies on native modules provided by Expo (`expo-camera`, `expo-image-picker`, etc.). It cannot be run directly in a web browser with full functionality without building for web, but the primary target is Android/iOS.
