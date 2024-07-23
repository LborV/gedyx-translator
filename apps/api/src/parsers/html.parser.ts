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
      if (token.name === 'openTag') {
        if (token.subTokens) {
          const tagNameToken = token.subTokens['tagName']

          if (tagNameToken) {
            for (let i = 0; i < this.nonClosingPattern.length; i++) {
              if (tagNameToken[0].value == this.nonClosingPattern[i]) {
                token.name = 'selfClosingTag'
                break
              }
            }
          }
        }
      } else if (token.name === 'closeTag') {
        if (
          this.nonClosingPattern.includes(
            token.value
              .replace('<', '')
              .replace('>', '')
              .replace('/', '')
              .split(' ')[0]
              .trim()
          )
        ) {
          token.name = 'selfClosingTag'
        }
      }

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

    const makeTree = (
      data: TTokenizeResult[],
      node: TTokenizeResult = {
        name: 'core',
        value: '',
        childs: []
      },
      index: number = 0
    ): { result: TTokenizeResult; index: number } => {
      for (let i = index; i < data.length; i++) {
        const token = data[i]

        switch (token.name) {
          case 'textData':
            if (node.name === 'textData') {
              node.value += token.value
              break
            }

            node.childs.push(token)
            break
          case 'openTag':
            const { result, index } = makeTree(data, token, i + 1)

            node.childs.push(result)
            i = index
            break
          case 'closeTag':
            if (node.name === 'core') {
              node.childs.push(token)
              break
            }

            node.closeToken = token

            return { result: node, index: i }
          default:
            node.childs.push(token)
            break
        }
      }

      return { result: node, index: data.length }
    }

    return makeTree(newData).result.childs
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
