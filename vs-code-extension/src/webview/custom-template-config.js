
// This script runs inside the VS Code Webview Panel.
// It must use vscode.postMessage to communicate with the main extension process.

const vscode = acquireVsCodeApi();

const saveButton = document.getElementById('save-template-btn');
const scaffoldButton = document.getElementById('scaffold-project-btn');
const outputDiv = document.getElementById('project-definition-output');

saveButton.addEventListener('click', () => {
    const templateData = {
        name: document.getElementById('project-name').value,
        type: document.getElementById('project-type').value,
        files: JSON.parse(document.getElementById('file-definitions').value || '[]'),
        directories: document.getElementById('directories').value.split(',').map(d => d.trim()).filter(d => d.length > 0)
    };

    // 1. Send data to the extension host to save the template
    vscode.postMessage({
        command: 'saveTemplate',
        data: templateData
    });

    // Display feedback
    outputDiv.textContent = 'Template successfully sent to extension host for saving.';
});

scaffoldButton.addEventListener('click', () => {
    const templateData = {
        name: document.getElementById('project-name').value,
        type: document.getElementById('project-type').value,
        files: JSON.parse(document.getElementById('file-definitions').value || '[]'),
        directories: document.getElementById('directories').value.split(',').map(d => d.trim()).filter(d => d.length > 0)
    };

    // 2. Send data to the extension host to trigger scaffolding
    vscode.postMessage({
        command: 'scaffoldProject',
        data: templateData
    });

    outputDiv.textContent = 'Scaffolding process initiated in the main extension process.';
});
