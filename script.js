// CipherDocs PDF-LTS - Main JavaScript File
// Handles PDF upload, processing, and text extraction

class CipherDocsPDF {
    constructor() {
        this.currentPDF = null;
        this.extractedText = '';
        this.initializeElements();
        this.bindEvents();
        this.setupPDFJS();
    }

    initializeElements() {
        // Get DOM elements
        this.uploadSection = document.getElementById('uploadSection');
        this.processingSection = document.getElementById('processingSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.textOutput = document.getElementById('textOutput');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newFileBtn = document.getElementById('newFileBtn');
    }

    bindEvents() {
        // File input events
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('click', () => this.fileInput.click());

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Action button events
        this.copyBtn.addEventListener('click', () => this.copyText());
        this.downloadBtn.addEventListener('click', () => this.downloadText());
        this.newFileBtn.addEventListener('click', () => this.resetApp());

        // Prevent default drag behaviors on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    setupPDFJS() {
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js';
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        // Validate file type
        if (file.type !== 'application/pdf') {
            alert('Please select a valid PDF file.');
            return;
        }

        // Show processing section
        this.showSection('processing');
        this.updateProgress(0, 'Loading PDF...');

        try {
            // Read file as array buffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            this.updateProgress(20, 'Parsing PDF structure...');

            // Load PDF document
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.currentPDF = pdf;
            this.updateProgress(40, 'Extracting text...');

            // Extract text from all pages
            await this.extractTextFromPDF(pdf);
            this.updateProgress(100, 'Complete!');

            // Show results after a brief delay
            setTimeout(() => {
                this.showResults();
            }, 500);

        } catch (error) {
            console.error('Error processing PDF:', error);
            alert('Error processing PDF file. Please try again with a different file.');
            this.resetApp();
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    async extractTextFromPDF(pdf) {
        const numPages = pdf.numPages;
        let fullText = '';
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Extract text items and join them
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                
                if (pageText.trim()) {
                    fullText += `--- Page ${pageNum} ---\n\n${pageText}\n\n`;
                }

                // Update progress
                const progress = 40 + Math.round((pageNum / numPages) * 50);
                this.updateProgress(progress, `Processing page ${pageNum} of ${numPages}...`);

            } catch (error) {
                console.warn(`Error extracting text from page ${pageNum}:`, error);
                fullText += `--- Page ${pageNum} ---\n\n[Error extracting text from this page]\n\n`;
            }
        }

        this.extractedText = fullText.trim() || 'No text could be extracted from this PDF.';
    }

    updateProgress(percentage, message) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${percentage}%`;
        
        const processingText = this.processingSection.querySelector('p');
        if (processingText) {
            processingText.textContent = message;
        }
    }

    showSection(section) {
        // Hide all sections
        this.uploadSection.style.display = 'none';
        this.processingSection.style.display = 'none';
        this.resultsSection.style.display = 'none';

        // Show requested section
        switch (section) {
            case 'upload':
                this.uploadSection.style.display = 'block';
                break;
            case 'processing':
                this.processingSection.style.display = 'flex';
                break;
            case 'results':
                this.resultsSection.style.display = 'block';
                break;
        }
    }

    showResults() {
        this.textOutput.textContent = this.extractedText;
        this.showSection('results');
    }

    async copyText() {
        try {
            await navigator.clipboard.writeText(this.extractedText);
            
            // Provide visual feedback
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = 'Copied!';
            this.copyBtn.style.background = '#28a745';
            
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
                this.copyBtn.style.background = '#007bff';
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy text:', error);
            alert('Failed to copy text to clipboard. Please select and copy manually.');
        }
    }

    downloadText() {
        const blob = new Blob([this.extractedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `extracted-text-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    resetApp() {
        // Clear data
        this.currentPDF = null;
        this.extractedText = '';
        this.fileInput.value = '';
        this.textOutput.textContent = '';
        
        // Reset progress
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '0%';
        
        // Show upload section
        this.showSection('upload');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if PDF.js is loaded
    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js library not found. Please ensure pdfjs/pdf.min.js is available.');
        alert('PDF.js library not found. Please check the installation.');
        return;
    }
    
    // Initialize the application
    new CipherDocsPDF();
    
    console.log('CipherDocs PDF-LTS initialized successfully');
});