// Client-side JavaScript for the Project Needs Configuration Webview
const vscode = acquireVsCodeApi();

document.getElementById('project-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const form = event.target;
    const projectName = form.projectName.value.trim();
    const projectType = form.projectType.value;
    const customNeedsJson = form.customNeeds.value;

    let customNeeds;
    try {
        customNeeds = JSON.parse(customNeedsJson);
    } catch (e) {
        document.getElementById('status-message').textContent = 'Error: Invalid JSON format in Custom Needs.';
        document.getElementById('status-message').classList.remove('status-success');
        document.getElementById('status-message').classList.add('status-error');
        return;
    }

    const projectData = {
        projectName: projectName,
        projectType: projectType,
        customNeeds: customNeeds
    };

    // Send the data back to the extension host
    vscode.postMessage({ command: 'defineProjectNeed', data: projectData });

    document.getElementById('status-message').textContent = 'Sending data...';
    document.getElementById('status-message').classList.remove('status-error');
    document.getElementById('status-message').classList.add('status-pending');
});