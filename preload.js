const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  savePDF: (pdfData, defaultFilename) => 
    ipcRenderer.invoke('save-pdf', pdfData, defaultFilename)
});


