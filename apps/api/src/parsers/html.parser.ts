import { Parser, TParserTokens, TTreeRules } from '../classes/parser.class'
import { TTokenizeResult } from '../classes/tokenizer.class'

export class html extends Parser {
  constructor() {
    super()
    this.join = this.join.bind(this)
  }

  /**
   * Пост-обработка лексического потока: нормализация void-тегов и склейка
   * соседнего текста, затем итеративная сборка дерева с авто-закрытием
   * опциональных тегов HTML5. Рекурсии нет — крупный/грязный HTML не роняет
   * стек вызовов.
   */
  join(data: TTokenizeResult[]): TTokenizeResult[] {
    const flat: TTokenizeResult[] = []

    for (const token of data) {
      if (token.name === 'openTag') {
        if (this.voidElements.has(this.openName(token))) {
          token.name = 'selfClosingTag'
        }
      } else if (token.name === 'closeTag') {
        if (this.voidElements.has(this.closeName(token))) {
          token.name = 'selfClosingTag'
        }
      }

      if (
        token.name === 'textData' &&
        flat.length &&
        flat[flat.length - 1].name === 'textData'
      ) {
        flat[flat.length - 1].value += token.value
        continue
      }

      flat.push(token)
    }

    return this.buildTree(flat, this.treeRules)
  }

  /** Имя открывающего тега из под-токенов (нормализованное, нижний регистр). */
  private openName(token: TTokenizeResult): string {
    const tagNameToken = token.subTokens && token.subTokens['tagName']

    return tagNameToken && tagNameToken[0]
      ? String(tagNameToken[0].value).toLowerCase()
      : ''
  }

  /** Имя закрывающего тега из сырого значения `</name ...>`. */
  private closeName(token: TTokenizeResult): string {
    return String(token.value)
      .replace(/[<>/]/g, '')
      .trim()
      .split(/\s+/)[0]
      .toLowerCase()
  }

  /**
   * Реализация опциональных закрывающих тегов HTML5 (§13.1.2.4):
   * какой открытый на вершине стека элемент неявно закрывается новым тегом.
   */
  private impliedClose(newName: string, openTop: string): boolean {
    if (openTop === 'p' && html.pClosers.has(newName)) {
      return true
    }

    const closes = html.optionalClose[newName]

    return closes ? closes.includes(openTop) : false
  }

  /** Хуки построения дерева для HTML-грамматики. */
  private get treeRules(): TTreeRules {
    return {
      isOpen: (t) => t.name === 'openTag',
      isClose: (t) => t.name === 'closeTag',
      openName: (t) => this.openName(t),
      closeName: (t) => this.closeName(t),
      impliedClose: (n, top) => this.impliedClose(n, top)
    }
  }

  tagNamePrettier(data: TTokenizeResult) {
    data.value = data.value.trim().replace(/<|>/g, '')

    return data
  }

  attributeSplitter(data: TTokenizeResult) {
    data.value = data.value.trim().split('=')

    data.value = {
      key: data.value[0],
      value: data.value[1].replace(/'|"/g, '')
    }

    return data
  }

  protected nonClosingPattern =
    'br,img,input,hr,meta,link,area,base,col,embed,source,track,wbr'.split(',')

  /** Void-элементы HTML: не имеют содержимого и закрывающего тега. */
  private voidElements = new Set(this.nonClosingPattern)

  /**
   * Блочные элементы, открытие которых закрывает незакрытый <p>
   * (HTML5: у <p> опциональный закрывающий тег).
   */
  private static readonly pClosers = new Set(
    (
      'address,article,aside,blockquote,details,div,dl,fieldset,figcaption,' +
      'figure,footer,form,h1,h2,h3,h4,h5,h6,header,hgroup,hr,main,menu,nav,' +
      'ol,p,pre,section,table,ul'
    ).split(',')
  )

  /**
   * Таблица опциональных закрывающих тегов HTML5: открытие ключевого тега
   * неявно закрывает перечисленные элементы, пока они на вершине стека.
   */
  private static readonly optionalClose: Record<string, string[]> = {
    li: ['li'],
    dt: ['dt', 'dd'],
    dd: ['dt', 'dd'],
    option: ['option'],
    optgroup: ['optgroup', 'option'],
    tr: ['tr', 'td', 'th'],
    td: ['td', 'th'],
    th: ['td', 'th'],
    thead: ['thead', 'tbody', 'tfoot', 'tr', 'td', 'th'],
    tbody: ['thead', 'tbody', 'tfoot', 'tr', 'td', 'th'],
    tfoot: ['thead', 'tbody', 'tfoot', 'tr', 'td', 'th'],
    caption: ['caption', 'colgroup'],
    colgroup: ['colgroup'],
    rt: ['rt', 'rp'],
    rp: ['rt', 'rp']
  }

  tokens = {
    comment: {
      pattern: '<!--*-->'
    },
    closeTag: {
      pattern: `<*(<)/*(<)>`
    },
    attribute: {
      pattern: ` *=|['*',"*"]`,
      after: 'attributeSplitter'
    },
    tagName: {
      pattern: '<*|[ ,/,>]',
      after: 'tagNamePrettier'
    },
    openTag: {
      pattern: '<*(/,<)>',
      inner: ['attribute', 'tagName']
    },
    scriptTag: {
      pattern: '<script*script>'
    },
    styleTag: {
      pattern: '<style*style>'
    },
    svgTag: {
      pattern: '<svg*svg>'
    },
    iframeTag: {
      pattern: '<iframe*iframe>'
    },
    core: {
      tokens: [
        'comment',
        'svgTag',
        'scriptTag',
        'styleTag',
        'selfClosingTag',
        'closeTag',
        'openTag',
        'textData'
      ],
      after: 'join'
    },
    textData: {
      pattern: '?'
    }
  } as TParserTokens
}
