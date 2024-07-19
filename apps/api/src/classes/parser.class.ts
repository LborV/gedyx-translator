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
  core: TParserCoreToken;
  [key: string]: TParserCoreToken | TParserToken;
};

export class Parser {
  protected tokens: TParserTokens;

  protected parse(tokens: TTokenizeResult[]): string {
    return '';
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

      const parsedPattern = this.parsePattern((this.tokens[tokenName] as TParserToken).pattern)

      tokens.push(
        new Token(
          tokenName,
          parsedPattern,
          (this.tokens[tokenName] as TParserToken).close
            ? tokens.find((t) => t.name === (this.tokens[tokenName] as TParserToken).close)
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
