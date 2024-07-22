import { Parser, TParserTokens } from '../classes/parser.class'
import { TTokenizeResult } from '../classes/tokenizer.class'

export class html extends Parser {
  constructor() {
    super()
    this.join = this.join.bind(this)
  }

  join(data: TTokenizeResult[]): TTokenizeResult[] {
    const newData = []

    data.forEach((token) => {
      if (token.name === 'textData') {
        if (newData.length && newData[newData.length - 1].name === 'textData') {
          newData[newData.length - 1].value += token.value
        } else {
          newData.push(token)
        }

        return
      }

      if (token.childs.length) {
        token.childs = this.join(token.childs)
      }

      newData.push(token)
    })

    return newData
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
    'br,img,input,hr,meta,link,area,base,col,embed,source,track,wbr'

  tokens = {
    comment: {
      pattern: '<!--*-->'
    },
    nonClosingTags: {
      pattern: `<*(<,=,${this.nonClosingPattern})|[${this.nonClosingPattern}]*(<,=,${this.nonClosingPattern})>`
    },
    closeTag: {
      pattern: `<*(<,=)/*(<,=)>`
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
      close: 'closeTag',
      inner: ['attribute', 'tagName']
    },
    scriptTag: {
      pattern: '<script*</script>'
    },
    styleTag: {
      pattern: '<style*</style>'
    },
    svgTag: {
      pattern: '<svg*</svg>'
    },
    core: {
      tokens: [
        'comment',
        'svgTag',
        'scriptTag',
        'styleTag',
        'nonClosingTags',
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
