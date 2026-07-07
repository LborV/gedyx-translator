import { TTokenizeResult } from '../classes/tokenizer.class'

/**
 * Плоское представление одного узла дерева токенов для хранения в БД по
 * модели adjacency list (parent + position). Чистые функции ниже не зависят
 * от TypeORM и полностью покрываются юнит-тестами.
 */
export type FlatToken = {
  /** Временный идентификатор в пределах одного разбора (0 — корень). */
  id: number
  /** Ссылка на родителя; null только у корня. */
  parentId: number | null
  /** Роль узла относительно родителя. */
  relation: 'root' | 'child' | 'close'
  /** Глобальный порядковый номер обхода — задаёт порядок узлов. */
  position: number
  /**
   * Поколение в графе сохранения (расстояние от корня). Родитель всегда
   * в меньшем поколении — позволяет сохранять пакетами «предки раньше потомков».
   */
  generation: number
  /** Семантический уровень вложенности (совместимость с прежним полем level). */
  level: number
  name: string
  /** JSON-кодированное исходное значение узла (строка). */
  value: string
}

/**
 * Итеративно (через явный стек, без рекурсии) разворачивает дерево токенов
 * в плоский список строк для пакетного сохранения. Первый элемент — корень
 * (relation='root'), под которым в порядке документа висят узлы верхнего уровня.
 */
export function flattenTree(tree: TTokenizeResult[]): FlatToken[] {
  const rows: FlatToken[] = []
  let nextId = 0
  let position = 0

  const rootId = nextId++
  rows.push({
    id: rootId,
    parentId: null,
    relation: 'root',
    position: position++,
    generation: 0,
    level: 0,
    name: 'core',
    value: JSON.stringify('')
  })

  type Frame = {
    nodes: TTokenizeResult[]
    i: number
    parentId: number
    generation: number
    level: number
  }

  const stack: Frame[] = [
    { nodes: tree, i: 0, parentId: rootId, generation: 1, level: 1 }
  ]

  while (stack.length) {
    const frame = stack[stack.length - 1]

    if (frame.i >= frame.nodes.length) {
      stack.pop()
      continue
    }

    const node = frame.nodes[frame.i++]
    const id = nextId++

    rows.push({
      id,
      parentId: frame.parentId,
      relation: 'child',
      position: position++,
      generation: frame.generation,
      level: frame.level,
      name: node.name,
      value: JSON.stringify(node.value)
    })

    if (node.closeToken) {
      rows.push({
        id: nextId++,
        parentId: id,
        relation: 'close',
        position: position++,
        generation: frame.generation + 1,
        level: frame.level,
        name: node.closeToken.name,
        value: JSON.stringify(node.closeToken.value)
      })
    }

    if (node.childs && node.childs.length) {
      stack.push({
        nodes: node.childs,
        i: 0,
        parentId: id,
        generation: frame.generation + 1,
        level: frame.level + 1
      })
    }
  }

  return rows
}

/** Минимальная строка, необходимая для сборки дерева обратно. */
export type FlatRow = Pick<
  FlatToken,
  'id' | 'parentId' | 'relation' | 'position' | 'name' | 'value'
>

/**
 * Собирает дерево токенов из плоских строк (в один проход, без рекурсии).
 * Возвращает узлы верхнего уровня (дети корня) в исходном порядке документа.
 */
export function buildTreeFromFlat(rows: FlatRow[]): TTokenizeResult[] {
  const ordered = [...rows].sort((a, b) => a.position - b.position)
  const nodeById = new Map<number, TTokenizeResult>()
  let root: TTokenizeResult | null = null

  for (const row of ordered) {
    const node: TTokenizeResult = {
      name: row.name,
      value: JSON.parse(row.value),
      childs: []
    }

    nodeById.set(row.id, node)

    if (row.relation === 'root') {
      root = node
      continue
    }

    const parent = row.parentId != null ? nodeById.get(row.parentId) : null

    if (!parent) {
      continue
    }

    if (row.relation === 'close') {
      parent.closeToken = node
    } else {
      parent.childs.push(node)
    }
  }

  return root ? root.childs : []
}

/** Группирует строки по поколениям для пакетного сохранения предков раньше потомков. */
export function groupByGeneration(rows: FlatToken[]): FlatToken[][] {
  const generations: FlatToken[][] = []

  for (const row of rows) {
    ;(generations[row.generation] ||= []).push(row)
  }

  return generations.filter(Boolean)
}
