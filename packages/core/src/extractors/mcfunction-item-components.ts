export interface ItemTextComponent {
  path: string;
  payload: string;
  payloadStart: number;
  payloadEnd: number;
  quote: "'" | '"';
}

function findClosingQuote(text: string, start: number, quote: "'" | '"'): number {
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === '\\') {
      index += 1;
    } else if (text[index] === quote) {
      return index;
    }
  }
  return -1;
}

function readQuotedComponent(
  text: string,
  start: number,
  path: string,
): ItemTextComponent | null {
  const quote = text[start];
  if (quote !== "'" && quote !== '"') return null;
  const end = findClosingQuote(text, start, quote);
  if (end < 0) return null;

  return {
    path,
    payload: text.slice(start + 1, end).replace(new RegExp(`\\\\${quote}`, 'g'), quote),
    payloadStart: start + 1,
    payloadEnd: end,
    quote,
  };
}

function skipWhitespace(text: string, start: number): number {
  let index = start;
  while (/\s/.test(text[index] ?? '')) index += 1;
  return index;
}

function findAssignment(line: string, name: string, start: number): number {
  const pattern = new RegExp(`(?:minecraft:)?${name}\\s*=`, 'gi');
  pattern.lastIndex = start;
  const match = pattern.exec(line);
  return match ? pattern.lastIndex : -1;
}

export function scanItemTextComponents(line: string): ItemTextComponent[] {
  const itemCommand = /\bitem\s+replace\b[\s\S]*?\swith\s/i.exec(line);
  if (!itemCommand) return [];

  const itemStart = (itemCommand.index ?? 0) + itemCommand[0].length;
  const componentsStart = line.indexOf('[', itemStart);
  if (componentsStart < 0) return [];

  const results: ItemTextComponent[] = [];
  const customNameStart = findAssignment(line, 'custom_name', componentsStart);
  if (customNameStart >= 0) {
    const component = readQuotedComponent(
      line,
      skipWhitespace(line, customNameStart),
      'item:custom_name',
    );
    if (component) results.push(component);
  }

  const loreStart = findAssignment(line, 'lore', componentsStart);
  if (loreStart < 0) return results;
  let index = skipWhitespace(line, loreStart);
  if (line[index] !== '[') return results;
  index += 1;

  let loreIndex = 0;
  while (index < line.length) {
    index = skipWhitespace(line, index);
    if (line[index] === ']') break;

    const component = readQuotedComponent(line, index, `item:lore:${loreIndex}`);
    if (!component) break;
    results.push(component);
    loreIndex += 1;
    index = skipWhitespace(line, component.payloadEnd + 1);
    if (line[index] === ',') index += 1;
  }

  return results;
}

export function encodeItemTextComponent(
  translation: string,
  quote: "'" | '"',
): string {
  return translation.replace(new RegExp(quote, 'g'), `\\${quote}`);
}
