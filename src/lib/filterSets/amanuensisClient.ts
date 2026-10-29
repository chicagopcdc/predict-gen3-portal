type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type JsonObject = Record<string, unknown>;

export interface FilterSetInput {
    name: string;
    description: string;
    filters: JsonObject;
    gqlFilter?: JsonObject;
}

export interface FilterSetRecord {
    id: number;
    name: string;
    description: string | null;
    filters: JsonObject;
}

const BASE_URL = '/amanuensis/filter-sets';

function filterSetUrl(explorerId: number, id?: number): string {
    const itemPath = id === undefined ? '' : `/${id}`;
    return `${BASE_URL}${itemPath}?explorerId=${explorerId}`;
}

function getCsrfToken(): string {
    if (typeof document === 'undefined') {
        throw new Error('Amanuensis writes must run in the browser.');
    }

    const cookie = document.cookie
        .split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith('csrftoken='));

    const token = cookie?.slice('csrftoken='.length);

    if (!token) {
        throw new Error('Missing csrftoken cookie. Sign in and reload the page.');
    }

    return decodeURIComponent(token);
}

async function request(
    url: string,
    method: Method,
    body?: FilterSetInput,
): Promise<unknown> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
    };

    if (method !== 'GET') {
        headers['x-csrf-token'] = getCsrfToken();
    }

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        credentials: 'include',
        cache: 'no-store',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `Amanuensis ${method} failed (${response.status}): ${text.slice(0, 200)}`,
        );
    }

    return text ? (JSON.parse(text) as unknown) : null;
}

export async function listFilterSets(
    explorerId: number,
): Promise<FilterSetRecord[]> {
    const result = await request(filterSetUrl(explorerId), 'GET');

    if (
        typeof result !== 'object' ||
        result === null ||
        !('filter_sets' in result) ||
        !Array.isArray(result.filter_sets)
    ) {
        throw new Error('Amanuensis returned an invalid filter-set list.');
    }

    return result.filter_sets as FilterSetRecord[];
}

export async function createFilterSet(
    explorerId: number,
    input: FilterSetInput,
): Promise<number> {
    const result = await request(filterSetUrl(explorerId), 'POST', input);

    if (
        typeof result !== 'object' ||
        result === null ||
        !('id' in result) ||
        typeof result.id !== 'number'
    ) {
        throw new Error('Amanuensis did not return a new filter-set ID.');
    }

    return result.id;
}

export async function updateFilterSet(
    explorerId: number,
    id: number,
    input: FilterSetInput,
): Promise<void> {
    await request(filterSetUrl(explorerId, id), 'PUT', input);
}

export async function deleteFilterSet(
    explorerId: number,
    id: number,
): Promise<void> {
    await request(filterSetUrl(explorerId, id), 'DELETE');
}