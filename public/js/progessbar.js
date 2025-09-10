
let progressInterval;
let isCancelled = false;

function startExportProcess(projectId) {
    // Reset cancel flag
    isCancelled = false;
    
    // Show overlay
    const overlay = document.getElementById('pdfProgressOverlay');
    const progressBar = document.getElementById('progressBar');
    overlay.classList.remove('hidden');
    
    // Start progress animation
    let progress = 0;
    progressBar.style.width = '0%';
    
    progressInterval = setInterval(() => {
        if (isCancelled) {
            clearInterval(progressInterval);
            return;
        }
        
        progress += Math.random() * 15;
        if (progress > 90) progress = 90; // Cap at 90% until completion
        
        progressBar.style.width = progress + '%';
    }, 200);
    
    // Fetch the print data and trigger print
    setTimeout(() => {
        if (!isCancelled) {
            // Create a temporary iframe to load print content
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = '/print/' + projectId;
            
            iframe.onload = function() {
                if (!isCancelled) {
                    // Complete progress and trigger print
                    progressBar.style.width = '100%';
                    
                    setTimeout(() => {
                        // Focus the iframe and trigger print
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        
                        // Hide overlay after a short delay
                        setTimeout(() => {
                            hideExportProgress();
                            document.body.removeChild(iframe);
                        }, 1000);
                    }, 300);
                }
            };
            
            document.body.appendChild(iframe);
        }
    }, 1500);
}

function hideExportProgress() {
    const overlay = document.getElementById('pdfProgressOverlay');
    const progressBar = document.getElementById('progressBar');
    
    overlay.classList.add('hidden');
    progressBar.style.width = '0%';
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function cancelExport() {
    isCancelled = true;
    hideExportProgress();
}

// Handle browser print events if user manually prints
window.addEventListener('beforeprint', () => {
    // Hide overlay when actual print dialog opens
    hideExportProgress();
});

setTimeout(() => {
    hideExportProgress();
}, 10000);

