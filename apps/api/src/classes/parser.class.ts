import { PatternFabric } from './pattern.class'
import { TTokenizeResult, Token, Tokenizer } from './tokenizer.class'

export type TParserToken = {
  pattern: string
  close?: string
  inner?: string[]
  after?: string
}

export type TParserCoreToken = {
  tokens: string[]
  after?: string
}

export type TParserTokens = {
  core: TParserCoreToken
  [key: string]: TParserCoreToken | TParserToken
}

/**
 * Структурные правила грамматики, управляющие сборкой плоского потока
 * токенов в дерево. Это обобщение построения дерева: любая грамматика
 * (HTML, XML, произвольная разметка) описывает, что считать открывающим
 * и закрывающим узлом и когда открытый узел неявно закрывается новым.
 */
export type TTreeRules = {
  /** Является ли токен открывающим узлом (создаёт уровень вложенности). */
  isOpen: (token: TTokenizeResult) => boolean
  /** Является ли токен закрывающим узлом. */
  isClose: (token: TTokenizeResult) => boolean
  /** Нормализованное имя открывающего токена (для сопоставления правил). */
  openName: (token: TTokenizeResult) => string
  /** Нормализованное имя закрывающего токена. */
  closeName: (token: TTokenizeResult) => string
  /**
   * Должен ли открытый на вершине стека узел `openTop` быть неявно закрыт,
   * когда встречается новый открывающий узел `newName`. Реализует
   * опциональные закрывающие теги (HTML5 §13.1.2.4) декларативно.
   */
  impliedClose?: (newName: string, openTop: string) => boolean
}

export class Parser {
  protected tokens: TParserTokens

  /**
   * Итеративная сборка дерева из плоского потока токенов через явный стек.
   * Не использует рекурсию, поэтому не переполняет стек вызовов ни на
   * глубокой вложенности, ни на массе незакрытых тегов (реальный HTML).
   */
  protected buildTree(
    tokens: TTokenizeResult[],
    rules: TTreeRules
  ): TTokenizeResult[] {
    const roots: TTokenizeResult[] = []
    const stack: { node: TTokenizeResult; name: string }[] = []
    const childrenOf = (): TTokenizeResult[] =>
      stack.length ? stack[stack.length - 1].node.childs : roots

    for (const token of tokens) {
      if (rules.isOpen(token)) {
        const name = rules.openName(token)

        if (rules.impliedClose) {
          while (
            stack.length &&
            rules.impliedClose(name, stack[stack.length - 1].name)
          ) {
            stack.pop()
          }
        }

        token.childs = token.childs || []
        childrenOf().push(token)
        stack.push({ node: token, name })
      } else if (rules.isClose(token)) {
        const name = rules.closeName(token)

        let idx = -1
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].name === name) {
            idx = i
            break
          }
        }

        if (idx >= 0) {
          // Всё, что открыто выше найденного узла, закрывается неявно.
          while (stack.length - 1 > idx) {
            stack.pop()
          }

          const matched = stack.pop()

          matched.node.closeToken = token
        } else {
          // Одиночный закрывающий тег без пары — сохраняем как есть на месте.
          childrenOf().push(token)
        }
      } else {
        childrenOf().push(token)
      }
    }

    return roots
  }

  /**
   * Итеративная сериализация дерева обратно в строку (round-trip).
   * Без рекурсии — безопасна на любой глубине.
   */
  public serialize(tree: TTokenizeResult[]): string {
    let out = ''
    const stack: { list: TTokenizeResult[]; i: number; close?: TTokenizeResult }[] =
      [{ list: tree, i: 0 }]

    while (stack.length) {
      const frame = stack[stack.length - 1]

      if (frame.i >= frame.list.length) {
        if (frame.close && typeof frame.close.value === 'string') {
          out += frame.close.value
        }

        stack.pop()
        continue
      }

      const token = frame.list[frame.i++]

      if (token.name === 'textData') {
        out += token.value
        continue
      }

      if (typeof token.value === 'string') {
        out += token.value
      }

      if (token.childs && token.childs.length) {
        stack.push({ list: token.childs, i: 0, close: token.closeToken })
      } else if (token.closeToken && typeof token.closeToken.value === 'string') {
        out += token.closeToken.value
      }
    }

    return out
  }

  private parsePattern(pattern: string): PatternFabric {
    const join = (data: TTokenizeResult[]): TTokenizeResult[] => {
      const newData = []

      data.forEach((token) => {
        if (token.name === 'textData') {
          if (
            newData.length &&
            newData[newData.length - 1].name === 'textData'
          ) {
            newData[newData.length - 1].value += token.value
          } else {
            newData.push(token)
          }

          return
        }

        if (token.childs.length) {
          token.childs = join(token.childs)
        }

        newData.push(token)
      })

      return newData
    }

    const anyOneToken = new Token('anyOne', new PatternFabric().is('?'))
    const anyToken = new Token('any', new PatternFabric().is('*'))
    const arrayToken = new Token(
      'array',
      new PatternFabric().is('['),
      new Token('arrayEnd', new PatternFabric().is(']'))
    )
    const orToken = new Token('or', new PatternFabric().is('|'))
    const argumentsToken = new Token(
      'arguments',
      new PatternFabric().is('('),
      new Token('argumentsEnd', new PatternFabric().is(')'))
    )
    const dataToken = new Token('textData', new PatternFabric().anyOne())

    const tokenizer = new Tokenizer(
      [anyOneToken, anyToken, arrayToken, orToken, argumentsToken, dataToken],
      join
    )

    const tokens = tokenizer.tokenize(pattern)
    const parsedPattern = new PatternFabric()

    tokens.forEach((token, index) => {
      if (token.name === 'anyOne') {
        parsedPattern.anyOne()

        return
      }

      if (token.name === 'any') {
        if (tokens[index + 1] && tokens[index + 1].name === 'arguments') {
          parsedPattern.any(tokens[index + 1].childs[0].value.split(','))
        } else {
          parsedPattern.any()
        }

        return
      }

      if (token.name === 'or') {
        if (tokens[index + 1] && tokens[index + 1].name === 'array') {
          const orArr = []
          let arrArgs = ''

          tokens[index + 1].childs.forEach((t) => {
            arrArgs += t.value
          })

          arrArgs.split(',').map((t) => {
            orArr.push(t)
          })

          parsedPattern.or(orArr.map((t) => this.parsePattern(t)))
        } else {
          throw new Error('Or token must be followed by arguments token')
        }

        return
      }

      if (token.name === 'textData') {
        parsedPattern.is(token.value)

        return
      }
    })

    return parsedPattern
  }

  public init(): Tokenizer {
    const tokenNames = Object.keys(this.tokens)
    const coreTokens: Token[] = []
    const tokens: Token[] = []

    if (!tokenNames.includes('core')) {
      throw new Error('Core token is required')
    }

    const core = this.tokens.core

    tokenNames.forEach((tokenName) => {
      if (tokenName === 'core') {
        return
      }

      const parsedPattern = this.parsePattern(
        (this.tokens[tokenName] as TParserToken).pattern
      )

      tokens.push(
        new Token(
          tokenName,
          parsedPattern,
          (this.tokens[tokenName] as TParserToken).close
            ? tokens.find(
                (t) => t.name === (this.tokens[tokenName] as TParserToken).close
              )
            : null,
          (this.tokens[tokenName] as TParserToken).inner
            ? (this.tokens[tokenName] as TParserToken).inner.map((t) =>
                tokens.find((token) => token.name === t)
              )
            : [],
          this[this.tokens[tokenName].after]
        )
      )

      if (core.tokens.includes(tokenName)) {
        coreTokens.push(tokens[tokens.length - 1])
      }
    })

    return new Tokenizer(coreTokens, core.after ? this[core.after] : null)
  }
}
