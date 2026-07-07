import { html } from './html.parser'
import { TTokenizeResult } from '../classes/tokenizer.class'

const parse = (src: string): TTokenizeResult[] => new html().init().tokenize(src)
const roundtrip = (src: string): string => new html().serialize(parse(src))

/** Компактный дамп структуры дерева для проверки вложенности. */
function structure(nodes: TTokenizeResult[]): unknown[] {
  return nodes
    .filter((n) => n.name !== 'textData' || String(n.value).trim())
    .map((n) => {
      if (n.name === 'textData') return `#text`
      const name =
        (n.subTokens && n.subTokens.tagName && n.subTokens.tagName[0].value) ||
        n.value
      const kids = n.childs && n.childs.length ? structure(n.childs) : []
      return kids.length ? { [name as string]: kids } : name
    })
}

describe('html parser — round-trip', () => {
  const cases: Record<string, string> = {
    simple: '<div><span>x</span></div>',
    'attr with >': '<div title="a > b">x</div>',
    void: '<div><br><img src="a"></div>',
    comment: '<div><!-- c --></div>',
    entities: '<p>a &amp; b &lt; c</p>',
    doctype: '<!DOCTYPE html><html><body>x</body></html>',
    'script with tags': '<div><script>if (a<b && c>d) {}</script></div>',
    uppercase: '<DIV><SPAN>x</SPAN></DIV>',
    'unclosed li list': '<ul><li>a<li>b<li>c</ul>',
    'unclosed table': '<table><tr><td>a<td>b<tr><td>c</table>'
  }

  for (const [name, src] of Object.entries(cases)) {
    it(`сохраняет исходник байт-в-байт: ${name}`, () => {
      expect(roundtrip(src)).toBe(src)
    })
  }
})

describe('html parser — устойчивость на крупном/грязном входе', () => {
  it('не переполняет стек на списке из 10k незакрытых <li>', () => {
    let items = ''
    for (let i = 0; i < 10000; i++) items += `<li>Item ${i}`
    const src = `<ul>${items}</ul>`

    expect(() => parse(src)).not.toThrow()
    expect(roundtrip(src)).toBe(src)
  })

  it('не переполняет стек на таблице из 8k строк без закрывающих тегов', () => {
    let rows = ''
    for (let i = 0; i < 8000; i++) rows += `<tr><td>a<td>b`
    const src = `<table>${rows}</table>`

    expect(() => parse(src)).not.toThrow()
    expect(roundtrip(src)).toBe(src)
  })

  it('не переполняет стек на вложенности глубиной 16000', () => {
    const src = '<div>'.repeat(16000) + 'x' + '</div>'.repeat(16000)

    expect(() => parse(src)).not.toThrow()
    expect(roundtrip(src)).toBe(src)
  })
})

describe('html parser — авто-закрытие опциональных тегов (HTML5)', () => {
  it('<li> без закрытия становятся соседями внутри <ul>', () => {
    expect(structure(parse('<ul><li>a<li>b<li>c</ul>'))).toEqual([
      { ul: [{ li: ['#text'] }, { li: ['#text'] }, { li: ['#text'] }] }
    ])
  })

  it('ячейки и строки таблицы раскладываются корректно', () => {
    expect(structure(parse('<table><tr><td>a<td>b<tr><td>c</table>'))).toEqual([
      {
        table: [
          { tr: [{ td: ['#text'] }, { td: ['#text'] }] },
          { tr: [{ td: ['#text'] }] }
        ]
      }
    ])
  })

  it('блочный элемент закрывает открытый <p>', () => {
    expect(structure(parse('<p>one<div>two</div><p>three'))).toEqual([
      { p: ['#text'] },
      { div: ['#text'] },
      { p: ['#text'] }
    ])
  })

  it('вложенный <ul> остаётся внутри своего <li>', () => {
    expect(structure(parse('<ul><li>a<ul><li>b</ul><li>c</ul>'))).toEqual([
      {
        ul: [
          { li: ['#text', { ul: [{ li: ['#text'] }] }] },
          { li: ['#text'] }
        ]
      }
    ])
  })
})
