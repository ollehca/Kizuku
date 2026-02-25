# Getting Started with Kizuku

A step-by-step guide to install and run Kizuku on your Mac.

Kizuku is a desktop design application that lets you import Figma files and work on them offline. No subscriptions, no cloud dependency -- you own your files.

---

## What You'll Need

Before starting, make sure you have:

- A Mac running macOS 13 (Ventura) or later
- At least 8 GB of free disk space
- An internet connection (for the initial setup only)
- A `.fig` file exported from Figma (to test the import)

---

## Step 1: Install Homebrew

Homebrew is a package manager for macOS that makes installing developer tools easy.

1. Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter)
2. Paste this command and press Enter:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

3. Follow the on-screen prompts. You may need to enter your Mac password.
4. When it finishes, it will show instructions to add Homebrew to your PATH. Follow those instructions (they usually look like):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

5. Verify it worked:

```bash
brew --version
```

You should see something like `Homebrew 4.x.x`.

---

## Step 2: Install Git, Node.js, and Docker

In Terminal, run:

```bash
brew install git node
brew install --cask docker
```

This installs:

- **Git** -- downloads the Kizuku source code
- **Node.js** -- runs the application
- **Docker Desktop** -- runs the PenPot design engine that powers Kizuku

After Docker installs, **open Docker Desktop** from your Applications folder. Wait until you see the Docker whale icon in your menu bar and it says "Docker Desktop is running". This is important -- Docker must be running before you continue.

---

## Step 3: Download Kizuku

1. Choose where you want to keep the project. Your home folder works fine:

```bash
cd ~/Documents
```

2. Clone the repository:

```bash
git clone --recurse-submodules https://github.com/ollehca/Kizuku.git
```

3. Move into the project folder:

```bash
cd Kizuku
```

4. Switch to the current working branch:

```bash
git checkout feature/figma-import-100-percent
```

---

## Step 4: Install Dependencies

Still inside the `Kizuku` folder, run:

```bash
npm install
```

This downloads all the libraries Kizuku needs. It may take a few minutes.

---

## Step 5: Set Up PenPot (First Time Only)

PenPot is the open-source design engine that Kizuku runs under the hood. It needs to be started once to build its containers.

1. Start the PenPot development environment:

```bash
cd penpot && ./manage.sh start-devenv
```

2. This will download several Docker images (1-2 GB). Wait until you see output indicating all services are running. This can take 5-10 minutes on the first run.

3. Go back to the Kizuku folder:

```bash
cd ..
```

---

## Step 6: Set Up the Demo License

Kizuku requires a license to run. For testing, generate a demo license:

```bash
KIZUKU_LICENSE_SECRET='test-secret-key-for-testing-only' node scripts/setup-demo-license.js
```

You should see output confirming the license was created.

---

## Step 7: Launch Kizuku

Run the startup script:

```bash
./scripts/start-kizuku.sh
```

This script:

1. Checks that Docker is running
2. Starts PenPot containers if they aren't already running
3. Starts the ClojureScript compiler (needed for the design UI)
4. Launches the Kizuku desktop application

The first launch may take 30-60 seconds while services start up. You'll see status messages in the terminal.

When everything is ready, the Kizuku window will appear showing the dashboard.

---

## Step 8: Import a Figma File

1. Find a `.fig` file on your Mac (export one from Figma if you don't have one)
2. Drag and drop the `.fig` file onto the Kizuku window
3. The import progress will show in the app
4. Once complete, the file opens in the design workspace

Your imported file is saved locally. The next time you open Kizuku, it will automatically restore your last open file.

---

## Everyday Use

After the initial setup, you only need to run one command to start Kizuku:

```bash
cd ~/Documents/Kizuku
./scripts/start-kizuku.sh
```

To quit, close the Kizuku window or press `Cmd + Q`.

To stop the background services when you're done for the day:

```bash
cd ~/Documents/Kizuku/penpot
./manage.sh stop-devenv
```

---

## Troubleshooting

### "Docker is not running"

Open Docker Desktop from your Applications folder and wait for it to fully start before running `start-kizuku.sh`.

### The app shows a blank white screen

The PenPot services may not have finished starting. Wait 30 seconds and refresh the window (`Cmd + R`). If it persists:

```bash
cd ~/Documents/Kizuku
./scripts/health-check.sh --repair
```

### Import fails or shows errors

Make sure the file is a valid `.fig` file exported directly from Figma. Kizuku supports files from Figma's current format.

### "Command not found" errors

Make sure you completed Step 1 (Homebrew) and Step 2 (Git, Node, Docker) successfully. Try closing and reopening Terminal, then run the commands again.

### PenPot containers won't start

If Docker ran out of resources, try increasing Docker Desktop's memory allocation:

1. Open Docker Desktop
2. Go to Settings (gear icon)
3. Select Resources
4. Set Memory to at least 4 GB
5. Click "Apply & Restart"

Then try launching Kizuku again.

---

## Updating Kizuku

To get the latest version:

```bash
cd ~/Documents/Kizuku
git pull origin feature/figma-import-100-percent
npm install
```

Then restart the app with `./scripts/start-kizuku.sh`.
