type FormatFn = (s?: string) => string;

function fmt(value: number): FormatFn {
    return (s = '%s'): string => `\x1b[${value}m${s}\x1b[0m`;
}

function map<T extends Record<keyof T, number>, S = Record<keyof T, FormatFn>>(o: T, v: number): S {
    return Object
        .keys(o)
        .reduce((a, b) => ({
            ...a,
            [b]: fmt(o[b as keyof T] + v)
        }), {}) as S;
}

const styles = {reset: 0, bold: 1, dim: 2, underline: 4, blink: 5, reverse: 7, hide: 8};
const colors = {black: 0, red: 1, green: 2, yellow: 3, blue: 4, magenta: 5, cyan: 6, white: 7};

export const format = {
    style: map(styles, 0),
    fg: {
        ...map(colors, 30),
        bright: map(colors, 90)
    },
    bg: {
        ...map(colors, 40),
        bright: map(colors, 100)
    }
};


export enum InsertionMode {
    Before = -1,
    Replace = 0,
    After = 1
}


/**
 * Inserts a value into a string at the correct position adhering to linebreaks and indentation
 *
 * @param text The text to insert the value into
 * @param find String to search for
 * @param value Value to insert
 * @param mode Insertion mode
 * @returns Modified text
 */
export function stringInsertion(text: string, find: string, value: string, mode: InsertionMode): string {
    let idx = text.indexOf(find);

    // value could not be found within the text
    if (idx === -1) {
        return text;
    }

    // replace the value at the correct position
    if (mode === InsertionMode.Replace) {
        return text.slice(0, idx) + value + text.slice(idx + find.length);
    }

    // move the index to the end of the search string
    if (mode === InsertionMode.After) {
        idx += find.length;
    }

    // find linebreak in the correct direction
    const findIdx = mode === InsertionMode.After
        ? text.indexOf.bind(text)
        : text.lastIndexOf.bind(text);
    let linebreak = findIdx('\n', idx);

    // continue finding linebreaks until a non-empty line is found
    let hasNewLine = false;
    while (text.slice(Math.min(linebreak, idx), Math.max(linebreak, idx)).trim() === '') {
        linebreak = findIdx('\n', linebreak + mode);
        hasNewLine = true;
    }
    if (mode === InsertionMode.After) {
        linebreak = text.lastIndexOf('\n', linebreak - 1);
    }
    linebreak++;

    // count the number of whitespace characters at the start of the line
    let indentCount = 0;
    if (hasNewLine) {
        while ([' ', '\t'].includes(text[linebreak + indentCount])) {
            indentCount++;
        }
    }

    // return the text with the new value inserted at the correct position
    return text.slice(0, idx)
        + (mode === InsertionMode.After && hasNewLine ? '\n' : '')
        + text.slice(linebreak, linebreak + indentCount) + value
        + (mode === InsertionMode.Before && hasNewLine ? '\n' : '')
        + text.slice(idx);
}
