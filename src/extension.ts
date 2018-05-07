'use strict';

import * as vscode from 'vscode';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import fetch from 'node-fetch';

const baseUrl = 'https://raw.githubusercontent.com/acharluk/easy-cpp-projects/master';

interface EasyFilesJSON {
    directories: string[];
    templates: { [name: string]: { [from: string]: string } };
}

export function activate(context: vscode.ExtensionContext) {
    let createProjectCommand = vscode.commands.registerCommand('easycpp.createProject', () => {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage("Open a folder or workspace before creating a project!");
            return;
        }
        fetch(baseUrl + '/templates/files.json')
            .then(res => res.json())
            .then(data => {
                let templates = [];
                for (let tname in data.templates) { templates.push(tname); }

                vscode.window.showQuickPick(templates)
                .then(selected => selectFolderAndDownload(data, selected));
            })
            .catch(error => vscode.window.showErrorMessage("Easy C++ Projects error: Could not fetch 'files.json' from GitHub\nError: " + error));
    });

    context.subscriptions.push(createProjectCommand);
}

export function deactivate() {
}

function selectFolderAndDownload(files: EasyFilesJSON, templateName: string | undefined): void {
    if (!templateName || !vscode.workspace.workspaceFolders) { return; }
    
    if (vscode.workspace.workspaceFolders.length > 1) {
        vscode.window.showWorkspaceFolderPick()
        .then(chosen => {
            if (!chosen) { return; }
            let folder = chosen.uri;
            downloadTemplate(files, templateName, folder.fsPath);
        });
    } else {
        downloadTemplate(files, templateName, vscode.workspace.workspaceFolders[0].uri.fsPath);
    }
}

function downloadTemplate(files: EasyFilesJSON, templateName: string, folder: string): void {
    files.directories.forEach((dir: string) => {
        if (!existsSync(folder + '/' + dir)) {
            mkdirSync(folder + '/' + dir);
        }
    });

    for (let file in files.templates[templateName]) {
        fetch(baseUrl + '/templates/' + "/" + file)
        .then(res => res.text())
        .then(data => {
            writeFileSync(folder + '/' + files.templates[templateName][file], data);
            if (files.templates[templateName][file] === 'src/main.cpp') {
                vscode.workspace.openTextDocument(folder + '/src/main.cpp')
                .then(doc => vscode.window.showTextDocument(doc));
            }
        })
        .catch(error => vscode.window.showErrorMessage(`Easy C++ Projects error: Could not download '${file}' from GitHub\nError: ` + error));
    }
}