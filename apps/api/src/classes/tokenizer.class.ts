import { PatternFabric } from './pattern.class'

export class Tokenizer {
  constructor(
    private tokens: Token[] = [],
    public postProcess?: (token: TTokenizeResult[]) => TTokenizeResult[]
  ) {}

  public checkStringForClosing(str: string) {
    this.tokens.forEach((token) => {
      if (!token.closeToken) {
        return
      }

      const openTokens = this.findTokens(str, token)

      if (!openTokens.length) {
        return
      }

      const closeTokens = this.findTokens(str, token.closeToken)

      if (!closeTokens.length) {
        throw new Error(`Close token not found for token ${token.name}`)
      }

      // console.log(token);
      // var util = require('util');
      // console.log(util.inspect(closeTokens, { showHidden: true, depth: 1000 }));
      
      // console.log(openTokens.length, closeTokens.length);
      

      if (openTokens.length !== closeTokens.length) {
        throw new Error(
          `Open and close tokens count not equal for token ${token.name}`
        )
      }
    })
  }

  public tokenize(str: string): TTokenizeResult[] {
    const tokens = this.find(str).subTokens

    return this.postProcess
      ? this.postProcess(this.afterFind(tokens))
      : this.afterFind(tokens)
  }

  private afterFind(tokens: TTokenizeResult[]): TTokenizeResult[] {
    tokens.forEach((token) => {
      if (!token.subTokens) {
        token.subTokens = {}
      }

      for (const i in this.tokens) {
        const t = this.tokens[i]

        if (t.name === token.name) {
          for (const j in t.recursive) {
            const recursiveToken = t.recursive[j]

            if (recursiveToken) {
              const tokenizer = new Tokenizer([
                recursiveToken,
                new Token('removable', new PatternFabric().anyOne())
              ])

              token.subTokens[recursiveToken.name] = tokenizer
                .tokenize(token.value)
                .filter((t) => t.name === recursiveToken.name)
            }
          }

          if (t.postProcess) {
            token = t.postProcess(token)
          }
        }
      }

      if (token.childs.length) {
        token.childs = this.afterFind(token.childs)
      }
    })

    return tokens
  }

  private find(
    str: string,
    tokens: TTokenizeResult[] = [],
    parentToken: Token = null
  ): { subTokens: TTokenizeResult[]; closeToken?: TTokenizeResult } {
    let currStr = str
    let index = 0
    let tokensList = this.tokens

    if (parentToken == null) {
      // this.checkStringForClosing(str)
    } else {
      tokensList = [parentToken.closeToken, ...tokensList]
    }

    for (let i = 0; i < tokensList.length && currStr.length >= 0; i++) {
      const token = tokensList[i]
      const result = token.find(currStr)

      if (result.end < 0) {
        continue
      }

      currStr = currStr.slice(result.end)
      result.start = index
      index += result.end
      i = -1
      result.end = index

      if (result.parentToken) {
        const subTokens = this.find(currStr, [], token)

        if (!subTokens.closeToken) {
          throw new Error(`Close token not found for token ${token.name}`)
        }

        result.childs = subTokens.subTokens
        result.closeToken = subTokens.closeToken
        index += subTokens.closeToken.end
        currStr = currStr.slice(result.closeToken.end)
      } else if (parentToken && result.name === parentToken.closeToken.name) {
        return {
          subTokens: tokens,
          closeToken: result
        }
      }

      tokens.push(result)
    }

    return { subTokens: tokens }
  }

  public findTokens(str: string, token: Token): TTokenizeResult[] {
    const results: TTokenizeResult[] = []

    for (let i = 0; i < str.length; i++) {
      const result = this.findFirstToken(str.slice(i), token)

      if (result) {
        result.start += i
        const tmp = i

        i += result.end - 1
        result.end += tmp

        results.push(result)
      }
    }

    return results
  }

  public findFirstToken(str: string, token: Token): TTokenizeResult {
    let index = 0

    while (index < str.length) {
      const result = token.find(str.slice(index))

      if (result.end >= 0) {
        result.start += index
        result.end += index

        return result
      }

      index++
    }

    return null
  }
}

export class Token {
  constructor(
    public name: string,
    private pattern: PatternFabric,
    public readonly closeToken: Token = null,
    public recursive: Token[] = null,
    public postProcess?: (token: TTokenizeResult) => TTokenizeResult
  ) {}

  public find(str: string): TTokenizeResult {
    const result = this.pattern.find(str)

    return {
      name: this.name,
      value: str.slice(0, result),
      start: 0,
      end: result,
      parentToken: this.closeToken ? true : false,
      childs: []
    }
  }
}

export type TTokenizeResult = {
  name: string
  subTokens?: Record<string, TTokenizeResult[]>
  value: any
  start?: number
  end?: number
  parentToken?: boolean
  childs: TTokenizeResult[]
  closeToken?: TTokenizeResult
}
