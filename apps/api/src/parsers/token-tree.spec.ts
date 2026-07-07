import { html } from './html.parser'
import { flattenTree, buildTreeFromFlat, groupByGeneration } from './token-tree'

const parser = new html()
const parse = (src: string) => new html().init().tokenize(src)

/** Полный цикл: дерево → плоские строки → дерево → строка. */
const throughFlat = (src: string): string => {
  const rows = flattenTree(parse(src))
  return parser.serialize(buildTreeFromFlat(rows))
}

describe('token-tree — round-trip через плоское представление', () => {
  const cases: Record<string, string> = {
    simple: '<div><span>x</span></div>',
    'siblings order': '<ul><li>a<li>b<li>c</ul>',
    table: '<table><tr><td>a<td>b<tr><td>c</table>',
    void: '<div><br><img src="a"></div>',
    comment: '<p>x<!-- c -->y</p>',
    'nested list': '<ul><li>a<ul><li>b</ul><li>c</ul>',
    'deep 500': '<div>'.repeat(500) + 'x' + '</div>'.repeat(500)
  }

  for (const [name, src] of Object.entries(cases)) {
    it(`восстанавливает исходник: ${name}`, () => {
      expect(throughFlat(src)).toBe(src)
    })
  }
})

describe('token-tree — инварианты плоской модели', () => {
  it('корень идёт первым и не имеет родителя', () => {
    const rows = flattenTree(parse('<div>x</div>'))
    expect(rows[0].relation).toBe('root')
    expect(rows[0].parentId).toBeNull()
  })

  it('родитель всегда в меньшем поколении, чем потомок (безопасность пакетного сохранения)', () => {
    const rows = flattenTree(parse('<ul><li>a<ul><li>b</ul></ul>'))
    const gen = new Map(rows.map((r) => [r.id, r.generation]))

    for (const row of rows) {
      if (row.parentId != null) {
        expect(row.generation).toBeGreaterThan(gen.get(row.parentId)!)
      }
    }
  })

  it('порядок соседних <li> сохраняется через position', () => {
    const rows = flattenTree(parse('<ul><li>a<li>b<li>c</ul>'))
    const built = buildTreeFromFlat(rows)
    const ul = built[0]
    const texts = ul.childs.map((li) => li.childs[0].value)
    expect(texts).toEqual(['a', 'b', 'c'])
  })

  it('поколения покрывают все строки', () => {
    const rows = flattenTree(parse('<div><span>x</span><b>y</b></div>'))
    const total = groupByGeneration(rows).reduce((n, g) => n + g.length, 0)
    expect(total).toBe(rows.length)
  })
})
