# 🚀 Quick Launch Instructions

## For First-Time Users

### Step 1: Verify Installation
```bash
# Check that dependencies are installed
ls node_modules/
```

If the `node_modules` folder is empty or missing, run:
```bash
npm install
```

### Step 2: Launch the Application
```bash
npm start
```

The application window will open automatically.

### Step 3: Try the Sample Data
1. Click the **📁 Upload** tab
2. Click **Select File**
3. Navigate to `sample-data/raid-helper-sample.json`
4. Click **Open**

You should see a summary of 25 players loaded.

### Step 4: Optimize
1. Click the **🎯 Composition** tab
2. Click **Optimize Composition**
3. View the optimized groups

### Step 5: Export
1. Click the **💾 Export** tab
2. Try **Copy to Clipboard**
3. Paste the result in a text editor to see the formatted output

## Troubleshooting

### "Cannot find module" error
```bash
rm -rf node_modules
npm install
npm start
```

### Application won't start
```bash
# Check Node.js version (should be 18+)
node --version

# Reinstall Electron
npm install electron --save-dev
npm start
```

### Black screen on launch
- Wait 5-10 seconds for the app to load
- Check the terminal for error messages
- Try closing and reopening

## Next Steps

Once the application is working:

1. **Configure Battle.net API** (optional)
   - See SETUP_GUIDE.md for detailed instructions
   - Required only for gear score fetching

2. **Import Your Data**
   - Export your raid signups from Raid Helper
   - Import the JSON file
   - Optimize your composition

3. **Customize Settings**
   - Adjust raid size
   - Set faction
   - Configure class weights
   - Save your preferences

## Documentation

- **README.md** - Overview and features
- **SETUP_GUIDE.md** - Detailed setup instructions
- **USER_GUIDE.md** - Complete user manual
- **PROJECT_SUMMARY.md** - Technical details

## Support

If you encounter issues:
1. Check the documentation files
2. Review error messages in the terminal
3. Try the test script: `node test-app.js`
4. Open an issue on the project repository

---

**Ready to optimize your raids!** ⚔️🛡️💚