# Magical Coordination Platform - Deployment and evaluation guide

## Technology Stack

- **Front-end**：HTML, CSS, JavaScript (Static pages are located in `public/` directory)
- **Back-end**：Node.js + Express (Main server file is `server.js`)
- **Data Storage**：JSON Files (e.g., `events.json`, `users.json`, `inventory.json`)

---

## Live Deployment

- **Static Front-end Pages**: Hosted via **GitHub Pages**. You can access the HI-FI prototype stably from Phase 2 in:
  - [https://pages.github.sydney.edu.au/ISYS2110-2025-S1/CC04-G03/](https://pages.github.sydney.edu.au/ISYS2110-2025-S1/CC04-G03/)

- **Full System (Back-end + Front-end)**: Deployed as a live mirror on **Render**. Access the complete system (including API and dynamic features) at:
  - [https://magical-coordination-platform.onrender.com](https://magical-coordination-platform.onrender.com)

---

## Environment Configuration (For Local Deployment)

1. **Environment Requirements**：
   - Node.js 18.x or higher
   - Suggested OS：Windows, macOS, Linux
   - Modern web browser with JavaScript supported (FireFox suggested)

2. **Install dependencies**：
   ```bash
   npm install
   ```

3. **Running service**：
   ```bash
   node server.js
   ```
   The Original listening port is 3000.

4. **Project Structure Explains**：
   - `public/`：Front-end static pages
   - `server.js`：Back-end API server
   - `*.json`：Data storage files

---

## Backup/Recovery Mechanisms

- **Backup**：
  - Make sure to back up `*.json` storage files (e.g., `events.json`, `users.json`, `inventory.json`, `item-log.json`, `report-visible-events.json`) to secure places.
  - You Can use git to regain data in previous commits or search in the GitHub repository for history files.

- **Recover**：
  - Replace the JSON files with the back-up files to regain previous data.

- **Important**：
  - Live site doesn't share the data storage which is in the code repository and will be refreshed after every deployment.

---

## Evaluator Instructions

1. **Launch Service**：
   - Refer to 'Live Deployment' and 'Environment Configuration' sections.

2. **Login and Roles**：
   - Uses preset user profile `users.json` to log in, or sign up for new accounts
   - Different roles（e.g., Junior Wizard, Senior Wizard）can access different pages and have different permissions.

3. **Interaction Guide**：
   - Event management, inventory management and history logs can be performed in web pages; data is stored in JSON files directly.
   - You Can try to add, edit, filter event or view inventory adjustments during evaluation.

---

## Common Issues（FAQ）

- If the live deployment site is currently down or experiencing with high delay，please contact the development team to redeploy the website.
- If the problem occurs, please follow the above guide to run the service locally.
- Regarding dependency issues, please make sure Node.js has required version and run `npm install`.

---

> If you need help or trouble occurs during evaluating, please contact the development team for help.
