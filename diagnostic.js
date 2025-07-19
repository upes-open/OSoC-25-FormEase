// FormEase Extension Diagnostic Script
// Copy and paste this into the browser console to diagnose issues

console.log("🔍 FormEase Diagnostic Starting...");

// 1. Check if content script is loaded
console.log("1. Checking for FormEase content script...");
if (typeof window.initializeFormEase === 'function') {
    console.log("✅ FormEase initialization function found");
} else {
    console.log("❌ FormEase initialization function NOT found");
}

// 2. Check for file inputs
console.log("2. Checking for file inputs...");
const fileInputs = document.querySelectorAll('input[type="file"]');
console.log(`Found ${fileInputs.length} file inputs:`, fileInputs);

fileInputs.forEach((input, index) => {
    console.log(`   Input ${index + 1}:`, {
        id: input.id,
        name: input.name,
        accept: input.accept,
        dataset: input.dataset,
        hasFormEaseId: !!input.dataset.formEaseId
    });
});

// 3. Check for FormEase toolboxes
console.log("3. Checking for FormEase toolboxes...");
const toolboxes = document.querySelectorAll('.formease-toolbox');
console.log(`Found ${toolboxes.length} FormEase toolboxes:`, toolboxes);

// 4. Check for script files in page
console.log("4. Checking for script resources...");
const scripts = Array.from(document.scripts);
const formeaseScripts = scripts.filter(script => 
    script.src.includes('content.js') || 
    script.src.includes('formease') ||
    script.textContent.includes('FormEase')
);
console.log("FormEase-related scripts:", formeaseScripts);

// 5. Check console for FormEase messages
console.log("5. Look for '[FormEase]' messages in console above/below");

// 6. Manual test trigger
console.log("6. Manual test - trying to initialize FormEase...");
try {
    if (window.initFormEaseSafely) {
        window.initFormEaseSafely();
        console.log("✅ Manual initialization attempted");
    } else if (window.initializeFormEase) {
        window.initializeFormEase();
        console.log("✅ Manual initialization attempted (fallback)");
    } else {
        console.log("❌ No initialization functions found");
    }
} catch (error) {
    console.log("❌ Error during manual initialization:", error);
}

// 7. Extension status check
console.log("7. Extension status check...");
chrome.runtime.getManifest ? 
    console.log("✅ Chrome extension API available") : 
    console.log("❌ Chrome extension API not available");

console.log("🔍 FormEase Diagnostic Complete!");
console.log("📋 Next steps:");
console.log("   - If content script not found: Reload extension in chrome://extensions");
console.log("   - If file inputs found but no toolboxes: Check console for errors");
console.log("   - If toolboxes exist but not working: Check event listeners");
