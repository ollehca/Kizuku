#!/bin/bash
set -e

echo "🎨 Starting PenPot to Kizuku rebranding..."

# Step 1: Copy logos
echo "📋 Step 1: Copying Kizuku logos to container..."
docker cp /Users/Achello/Documents/Projects/Kizuku/src/Logos/KizukuDarkOutline.svg penpot-devenv-main:/tmp/kizuku-logo.svg
docker cp /Users/Achello/Documents/Projects/Kizuku/src/Logos/KizukuDarkOutline.svg penpot-devenv-main:/tmp/kizuku-logo-icon.svg

# Step 2: Replace logo files
echo "🖼️  Step 2: Replacing logo files..."
docker exec penpot-devenv-main bash -c '
  cd /home/penpot/penpot/frontend

  # Backup originals
  mkdir -p /tmp/penpot-backup
  cp resources/images/icons/penpot-logo*.svg /tmp/penpot-backup/ 2>/dev/null || true

  # Replace main logos
  cp /tmp/kizuku-logo.svg resources/images/icons/penpot-logo.svg
  cp /tmp/kizuku-logo-icon.svg resources/images/icons/penpot-logo-icon.svg
  cp /tmp/kizuku-logo-icon.svg resources/images/icons/penpot-logo-icon-loader.svg

  # Copy to public directories
  mkdir -p resources/public/images/icons
  cp /tmp/kizuku-logo.svg resources/public/images/icons/penpot-logo.svg
  cp /tmp/kizuku-logo-icon.svg resources/public/images/icons/penpot-logo-icon.svg
  cp /tmp/kizuku-logo-icon.svg resources/public/images/icons/penpot-logo-icon-loader.svg

  # Copy to assets directories
  mkdir -p resources/images/assets resources/public/images/assets
  cp /tmp/kizuku-logo.svg resources/images/assets/penpot-logo.svg
  cp /tmp/kizuku-logo-icon.svg resources/images/assets/penpot-logo-icon.svg
  cp /tmp/kizuku-logo.svg resources/public/images/assets/penpot-logo.svg
  cp /tmp/kizuku-logo-icon.svg resources/public/images/assets/penpot-logo-icon.svg

  # Replace variant logos
  cp /tmp/kizuku-logo.svg resources/images/icons/logo-error-screen.svg 2>/dev/null || true
  cp /tmp/kizuku-logo.svg resources/images/icons/logo-subscription.svg 2>/dev/null || true
  cp /tmp/kizuku-logo.svg resources/images/icons/logo-subscription-light.svg 2>/dev/null || true

  echo "✅ Logo files replaced"
'

# Step 3: Replace text in ClojureScript files
echo "📝 Step 3: Updating ClojureScript source files..."
docker exec penpot-devenv-main bash -c '
  cd /home/penpot/penpot/frontend/src

  # Icon references
  find . -name "*.cljs" -o -name "*.clj" | xargs sed -i "s/:penpot-logo/:kizuku-logo/g"
  find . -name "*.cljs" -o -name "*.clj" | xargs sed -i "s/penpot-logo-icon/kizuku-logo-icon/g"

  # File extension
  find . -name "*.cljs" | xargs sed -i "s/\.penpot/.kizuku/g"
  find . -name "*.cljs" | xargs sed -i "s/penpot\/export-files/kizuku\/export-files/g"
  find . -name "*.cljs" | xargs sed -i "s/:penpot:/:kizuku:/g"

  # Hard-coded strings
  find . -name "*.cljs" | xargs sed -i "s/\"Penpot\"/\"Kizu\"/g"
  find . -name "*.cljs" | xargs sed -i "s/title=\"Penpot\"/title=\"Kizu\"/g"

  echo "✅ ClojureScript files updated"
'

# Step 4: Update HTML
echo "🌐 Step 4: Updating HTML files..."
docker exec penpot-devenv-main bash -c '
  cd /home/penpot/penpot/frontend

  sed -i "s/Penpot - Design Freedom for Teams/Kizuku - Design Freedom for Teams/g" resources/public/index.html
  sed -i "s/Penpot | Design Freedom for Teams/Kizuku | Design Freedom for Teams/g" resources/public/index.html
  sed -i "s/@penpotapp/@kizukuapp/g" resources/public/index.html
  sed -i "s/penpot\.app/kizuku.app/g" resources/public/index.html
  # NOTE: Do NOT change window.penpotWorkerURI or window.penpotTranslations
  # These are internal API names that the compiled ClojureScript code depends on

  echo "✅ HTML files updated"
'

# Step 5: Update translations
echo "🌍 Step 5: Updating translation files..."
docker exec penpot-devenv-main bash -c '
  cd /home/penpot/penpot/frontend/translations

  find . -name "*.po" | xargs sed -i "s/Penpot/Kizuku/g"
  find . -name "*.po" | xargs sed -i "s/penpot/kizuku/g"
  find . -name "*.po" | xargs sed -i "s/PENPOT/KIZUKU/g"
  find . -name "*.po" | xargs sed -i "s/\.penpot/.kizuku/g"
  find . -name "*.po" | xargs sed -i "s/@penpotapp/@kizukuapp/g"
  find . -name "*.po" | xargs sed -i "s/penpot\.app/kizuku.app/g"

  echo "✅ Translation files updated"
'

# Step 6: Update config files
echo "⚙️  Step 6: Updating configuration files..."
docker exec penpot-devenv-main bash -c '
  cd /home/penpot/penpot/frontend

  # Update config.cljs
  sed -i "s/penpotTemplatesUri/kizukuTemplatesUri/g" src/app/config.cljs
  sed -i "s/penpot\.github\.io\/penpot-files/kizuku.github.io\/kizuku-files/g" src/app/config.cljs

  # Update package.json
  sed -i "s/\"penpot-frontend\"/\"kizuku-frontend\"/g" package.json

  echo "✅ Configuration files updated"
'

# Step 7: Rebuild
echo "🔨 Step 7: Rebuilding frontend (this may take a few minutes)..."
docker exec penpot-devenv-main bash -c '
  cd /home/penpot/penpot/frontend
  yarn run clear:shadow-cache
  yarn run build:app
'

echo ""
echo "✨ Rebranding complete!"
echo ""
echo "Next steps:"
echo "1. Restart your Kizuku app to see the changes"
echo "2. Verify the Kizuku logo appears in the dashboard"
echo "3. Check that all text says 'Kizuku' instead of 'Penpot'"
echo ""
