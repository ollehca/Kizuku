# Getting Started with Kizuku

A step-by-step guide to install and run Kizuku on your Mac.

Kizuku is a desktop design application that lets you import Figma files and work on them offline. No subscriptions, no cloud dependency -- you own your files.

---

## What You'll Need

Before starting, make sure you have:

- A Mac running macOS 13 (Ventura) or later
- At least 8 GB of free disk space
- An internet connection (for the initial setup only)
- About 30 minutes for the first-time setup
- A `.fig` file exported from Figma (optional, to test the import)

---

## Before We Begin: What is Terminal?

Terminal is an app built into every Mac that lets you type commands to control your computer. Think of it as a text-based way to do things you'd normally do by clicking around in Finder.

**How to open Terminal:**

1. Press `Cmd + Space` on your keyboard (this opens Spotlight Search)
2. Type **Terminal**
3. Press **Enter**

A window will appear with a blinking cursor. This is where you'll type (or paste) the commands in this guide.

**Tips for using Terminal:**

- To **paste** a command: press `Cmd + V` (same as pasting anywhere else on Mac)
- To **run** a command: press **Enter** after pasting or typing it
- **Don't panic** if you see lots of text scrolling by -- that's normal, it's just the computer telling you what it's doing
- If something asks for your **password**, type your Mac login password. You won't see any characters appear as you type -- that's a security feature, not a bug. Just type it and press Enter
- If something goes wrong, you can usually close Terminal and start it fresh

You'll keep Terminal open throughout this entire setup process.

---

## Step 1: Install Homebrew

Homebrew is a free tool that makes it easy to install other software on your Mac. We need it to install the tools Kizuku depends on.

1. Open **Terminal** (see instructions above)
2. Copy this entire line, paste it into Terminal, and press **Enter**:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

3. It will ask for your Mac password -- type it and press Enter (remember, you won't see the characters as you type)
4. It may also ask you to press Enter to confirm. Do so and wait -- this takes a few minutes
5. **Important:** When it finishes, look at the last few lines of output. If you see instructions that say "Run these commands in your terminal", copy and paste those commands one at a time. They usually look like this:

```
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

6. To check that it worked, type this and press Enter:

```
brew --version
```

If you see something like `Homebrew 4.x.x`, you're good. If you see "command not found", close Terminal, reopen it, and try the `brew --version` command again.

---

## Step 2: Install Git, Node.js, and Docker

Now we'll use Homebrew to install three tools Kizuku needs. You don't need to understand what these do -- just run the commands.

**What these tools are (in simple terms):**
- **Git** -- a tool that downloads Kizuku's code from the internet
- **Node.js** -- a tool that runs Kizuku's application code
- **Docker Desktop** -- an app that runs the design engine inside Kizuku

Paste this into Terminal and press Enter:

```
brew install git node
```

Wait for it to finish (you'll see the blinking cursor come back). Then paste this and press Enter:

```
brew install --cask docker
```

This installs Docker Desktop. When it's done:

1. Open **Finder**
2. Click **Applications** in the sidebar
3. Find **Docker** and double-click it to open it
4. Docker may ask for permission to run -- click **OK** or **Allow** on any prompts
5. Wait until you see a small **whale icon** in the menu bar at the top of your screen
6. Click the whale icon -- it should say **"Docker Desktop is running"**

**Do not continue until Docker is running.** This is the most common cause of problems later.

---

## Step 3: Download Kizuku

Now we'll download Kizuku's code to your Mac.

1. First, navigate to your Documents folder by pasting this into Terminal:

```
cd ~/Documents
```

(This tells Terminal "go to my Documents folder")

2. Download Kizuku by pasting this command:

```
git clone --recurse-submodules https://github.com/ollehca/Kizuku.git
```

This may take a few minutes. You'll see progress percentages. Wait until it finishes and you see the blinking cursor again.

3. Go into the Kizuku folder:

```
cd Kizuku
```

4. Switch to the latest version:

```
git checkout feature/figma-import-100-percent
```

You should see a message like `Switched to branch 'feature/figma-import-100-percent'`.

---

## Step 4: Install Kizuku's Dependencies

Kizuku uses many small software libraries. This command downloads all of them:

```
npm install
```

This may take 2-5 minutes. You'll see a progress bar and lots of text. Wait until it finishes and you see the blinking cursor again.

If you see some yellow "WARN" messages, that's fine -- warnings are not errors. As long as you don't see red "ERR!" messages, everything worked.

---

## Step 5: Set Up PenPot (First Time Only)

PenPot is the open-source design engine that powers Kizuku's workspace. This step downloads and sets up PenPot on your Mac. You only need to do this once.

**Make sure Docker Desktop is still running** (check for the whale icon in your menu bar).

1. Run this command to start PenPot:

```
cd penpot && ./manage.sh start-devenv
```

2. The first time you run this, it will download about 1-2 GB of data. This can take **5-15 minutes** depending on your internet speed. You'll see lots of download progress messages -- this is normal.

3. Wait until the downloads finish and the text stops scrolling. You should see messages about services starting.

4. Go back to the Kizuku folder:

```
cd ..
```

---

## Step 6: Set Up the Demo License

Kizuku needs a license key to run. For now, we'll generate a free demo license for testing:

```
KIZUKU_LICENSE_SECRET='test-secret-key-for-testing-only' node scripts/setup-demo-license.js
```

You should see output that includes a license code like `KIZUKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`. This means it worked.

---

## Step 7: Launch Kizuku

You're ready to start the app. Run:

```
./scripts/start-kizuku.sh
```

**What happens next:**

1. The script checks that everything is set up correctly
2. It starts the design engine (PenPot)
3. It starts a code compiler (this prevents error messages in the app)
4. It launches the Kizuku desktop window

The first launch takes 30-60 seconds. You'll see status messages in Terminal. **Don't close Terminal** -- it needs to stay open while Kizuku is running.

When the Kizuku window appears showing a dashboard, you're ready to go.

---

## Step 8: Import a Figma File

Now let's test it with a real Figma file.

**If you have a `.fig` file:**

1. Find the `.fig` file in Finder
2. Drag it from Finder and drop it onto the Kizuku window
3. You'll see import progress -- wait for it to complete
4. The file will open in the design workspace

**If you don't have a `.fig` file:**

1. Open Figma in your web browser
2. Open any design file
3. Go to **File > Save local copy** -- this downloads a `.fig` file
4. Drag that downloaded file onto the Kizuku window

Your imported file is saved automatically. The next time you open Kizuku, it will restore your last open file right where you left off.

---

## Everyday Use (After Setup)

Once everything is installed, starting Kizuku is simple. Open Terminal and run:

```
cd ~/Documents/Kizuku && ./scripts/start-kizuku.sh
```

That's it. The app will open and restore your last session.

**To quit:** Close the Kizuku window or press `Cmd + Q`.

**To stop background services** (frees up system resources when you're done designing):

```
cd ~/Documents/Kizuku/penpot && ./manage.sh stop-devenv
```

---

## Troubleshooting

### "Docker is not running"

1. Open Docker Desktop from your Applications folder
2. Wait for the whale icon to appear in the menu bar
3. Try launching Kizuku again

### The app shows a blank white screen

The design engine may still be starting up. Try these steps:

1. Wait 30 seconds
2. Press `Cmd + R` to refresh
3. If still blank, run this in Terminal:

```
cd ~/Documents/Kizuku && ./scripts/health-check.sh --repair
```

### "Command not found" when running a command

This usually means a previous step didn't complete. Try:

1. Close Terminal completely (`Cmd + Q`)
2. Reopen Terminal
3. Run the command again

If `brew` is not found, go back to Step 1. If `npm` or `node` is not found, go back to Step 2.

### Import fails or freezes

- Make sure the file ends in `.fig` (not `.figma` or `.json`)
- Try a smaller/simpler Figma file first
- Check Terminal for error messages -- they may explain what went wrong

### PenPot won't start or Docker seems slow

Docker needs enough memory to run properly:

1. Click the whale icon in the menu bar
2. Select **Settings** (or **Preferences**)
3. Click **Resources** in the sidebar
4. Set **Memory** to at least **4 GB** (6 GB recommended)
5. Click **Apply & Restart**
6. Wait for Docker to restart, then try launching Kizuku again

### "Permission denied" errors

If a command fails with "permission denied", try putting `sudo` in front of it. For example:

```
sudo ./scripts/start-kizuku.sh
```

It will ask for your Mac password, then run the command with administrator privileges.

---

## Updating Kizuku

To get the latest version in the future, open Terminal and run:

```
cd ~/Documents/Kizuku
git pull origin feature/figma-import-100-percent
npm install
```

Then start the app normally with `./scripts/start-kizuku.sh`.

---

## Getting Help

If you run into a problem not covered here, open an issue at:

https://github.com/ollehca/Kizuku/issues

Include:
- What step you were on
- The exact error message (copy and paste from Terminal)
- Your macOS version (click the Apple menu > About This Mac)
