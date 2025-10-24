# Google Maps Autocomplete Demo

This repository contains a minimal static site that loads Google Maps with an address/places autocomplete search bar floating over the map. Selecting a suggestion recenters the map and moves the marker to the chosen location, while the map initially attempts to zoom to the user's current location via the browser's geolocation API.

## Getting started

1. Duplicate the example configuration file and insert your own Google Maps API key:

   ```bash
   cp public/config.js.example public/config.js
   ```

2. Edit `public/config.js` and replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key.

3. Serve the `public` directory with any static file server. A quick option is to use `npx serve`:

   ```bash
   npx serve public
   ```

4. Visit the printed URL (typically `http://localhost:3000`) to interact with the map.

> **Note:** Never commit your real API key to version control. Keep `public/config.js` out of git by adding it to `.gitignore` if you create one.

## Features

- Google Maps JavaScript API integration with Places Autocomplete.
- Floating search card styled for desktop and mobile web.
- Automatic map centering on the selected suggestion.
- Optional geolocation-based centering when the user grants permission.

## Requirements

- A Google Cloud project with the Maps JavaScript API and Places API enabled.
- A valid Google Maps API key with appropriate HTTP referrer restrictions.
