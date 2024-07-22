export class PatternPart {
  constructor(
    protected patternBefore: PatternPart = null,
    protected patternAfter: PatternPart = null
  ) {}

  setPatternAfter(pattern: PatternPart): void {
    this.patternAfter = pattern
  }

  setPatternBefore(pattern: PatternPart): void {
    this.patternBefore = pattern
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getIndex(str: string): number {
    throw new Error('Method not implemented.')
  }
}

export class PatternPartOr extends PatternPart {
  constructor(
    protected patternBefore: PatternPart = null,
    private patterns: PatternFabric[] = []
  ) {
    super(patternBefore)
  }

  getIndex(str: string): number {
    for (let i = 0; i < this.patterns.length; i++) {
      const index = this.patterns[i].find(str)

      if (index >= 0) {
        return index
      }
    }

    return -1
  }
}

export class PatternPartExactly extends PatternPart {
  constructor(
    protected patternBefore: PatternPart = null,
    protected patternAfter: PatternPart = null,
    public exactly: string
  ) {
    super(patternBefore, patternAfter)
  }

  getIndex(str: string): number {
    let findIndex = 0

    for (; findIndex < this.exactly.length; findIndex++) {
      if (str[findIndex] !== this.exactly[findIndex]) {
        return -1
      }
    }

    return findIndex < 0 ? -1 : findIndex
  }
}

export class PatternRegex extends PatternPart {
  constructor(
    protected patternBefore: PatternPart = null,
    protected patternAfter: PatternPart = null,
    private regex: RegExp
  ) {
    super(patternBefore, patternAfter)
  }

  getIndex(str: string): number {
    const match = str.match(this.regex)

    return match ? match[0].length : -1
  }
}

export class PatternPartAny extends PatternPart {
  constructor(
    protected patternBefore: PatternPart = null,
    private exclude: string[] = []
  ) {
    super(patternBefore)
  }

  getIndex(str: string): number {
    if (!this.patternAfter) {
      return str.length - 1
    }

    let index = 0

    while (index < str.length) {
      for (let i = 0; i < this.exclude.length; i++) {
        if (this.exclude[i].length == 1 && str[index] === this.exclude[i]) {
          return -1
        } else if (
          str.slice(index, index + this.exclude[i].length) === this.exclude[i]
        ) {
          return -1
        }
      }

      const newIndex = this.patternAfter.getIndex(str.slice(index))

      if (newIndex >= 0) {
        return index + newIndex
      }

      index++
    }

    return -1
  }
}

export class PatternPartAnyOne extends PatternPartAny {
  getIndex(str: string): number {
    if (str.length === 0) {
      return -1
    }

    return 1
  }
}

export class PatternPartIsNot extends PatternPart {
  constructor(
    protected patternBefore: PatternPart = null,
    public exactlyNot: string
  ) {
    super(patternBefore)
  }

  getIndex(str: string): number {
    let findIndex = 0

    for (; findIndex < this.exactlyNot.length; findIndex++) {
      if (str[findIndex] !== this.exactlyNot[findIndex]) {
        return 1
      }
    }

    return -1
  }
}

export class PatternPartAnd extends PatternPart {
  constructor(
    protected patternBefore: PatternPart = null,
    private patterns: PatternFabric[] = []
  ) {
    super(patternBefore)
  }

  getIndex(str: string): number {
    let index = 0

    for (let i = 0; i < this.patterns.length; i++) {
      const newIndex = this.patterns[i].find(str.slice(index))

      if (newIndex < 0) {
        return -1
      }

      index += newIndex
    }

    return index
  }
}

export class PatternPartEmpty extends PatternPart {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getIndex(str: string): number {
    return 0
  }
}

export class PatternFabric {
  private patternPartOrder: PatternPart[] = []

  constructor() {}

  is(find: string): PatternFabric {
    return this.insertPatternPart(
      new PatternPartExactly(
        this.patternPartOrder[this.patternPartOrder.length - 1],
        null,
        find
      )
    )
  }

  any(exclude: string[] = []): PatternFabric {
    return this.insertPatternPart(
      new PatternPartAny(
        this.patternPartOrder[this.patternPartOrder.length - 1],
        exclude
      )
    )
  }

  anyOne(): PatternFabric {
    return this.insertPatternPart(
      new PatternPartAnyOne(
        this.patternPartOrder[this.patternPartOrder.length - 1]
      )
    )
  }

  and(patterns: PatternFabric[]): PatternFabric {
    return this.insertPatternPart(
      new PatternPartAnd(
        this.patternPartOrder[this.patternPartOrder.length - 1],
        patterns
      )
    )
  }

  isNot(find: string): PatternFabric {
    return this.insertPatternPart(
      new PatternPartIsNot(
        this.patternPartOrder[this.patternPartOrder.length - 1],
        find
      )
    )
  }

  or(patterns: PatternFabric[]): PatternFabric {
    return this.insertPatternPart(
      new PatternPartOr(
        this.patternPartOrder[this.patternPartOrder.length - 1],
        patterns
      )
    )
  }

  empty(): PatternFabric {
    return this.insertPatternPart(
      new PatternPartEmpty(
        this.patternPartOrder[this.patternPartOrder.length - 1]
      )
    )
  }

  match(regex: RegExp): PatternFabric {
    return this.insertPatternPart(
      new PatternRegex(
        this.patternPartOrder[this.patternPartOrder.length - 1],
        null,
        regex
      )
    )
  }

  find(str: string): number {
    let index = 0

    for (let i = 0; i < this.patternPartOrder.length; i++) {
      const newIndex = this.patternPartOrder[i].getIndex(str.slice(index))

      if (this.patternPartOrder[i] instanceof PatternPartAny) {
        i++
      }

      if (newIndex < 0) {
        return -1
      }

      index += newIndex

      if (index > str.length) {
        throw new Error('Error PatternFabric.find()')
      }

      if (index == str.length) {
        return index
      }
    }

    return index
  }

  private getLastPatternPart(): PatternPart {
    return this.patternPartOrder[this.patternPartOrder.length - 1]
  }

  private insertPatternPart(patternPart: PatternPart): PatternFabric {
    const lastPart = this.getLastPatternPart()

    if (lastPart) {
      lastPart.setPatternAfter(patternPart)
    }

    this.patternPartOrder.push(patternPart)

    return this
  }
}
