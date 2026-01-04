import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | null = null;
let initializationPromise: Promise<PyodideInterface> | null = null;

export async function initializePyodide(): Promise<PyodideInterface> {
    if (pyodideInstance) {
        return pyodideInstance;
    }

    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            console.log('Loading Pyodide...');
            const pyodide = await loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/'
            });

            console.log('Installing required packages...');
            await pyodide.loadPackage(['micropip', 'sqlite3']);
            await pyodide.runPythonAsync(`
                import micropip
                await micropip.install(['genanki'])
            `);

            pyodideInstance = pyodide;
            console.log('Pyodide and genanki initialized successfully');
            return pyodide;
        } catch (error) {
            console.error('Failed to initialize Pyodide:', error);
            initializationPromise = null;
            throw error;
        }
    })();

    return initializationPromise;
}

export function getPyodideInstance(): PyodideInterface | null {
    return pyodideInstance;
}
