import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm/repository/Repository'
import { Projects } from '../entities/projects.entity'
import { Documents } from '../entities/documents.entity'
import MurmurHash3 from 'imurmurhash'
import { html } from '../parsers/html.parser'
import { Tokens } from '../entities/tokens.entity'
import { TTokenizeResult } from '../classes/tokenizer.class'
import { unescape } from 'querystring'
import { DataSource, EntityManager } from 'typeorm'
import {
  flattenTree,
  buildTreeFromFlat,
  groupByGeneration,
  FlatToken
} from '../parsers/token-tree'

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Projects)
    private projectsRepository: Repository<Projects>,
    @InjectRepository(Documents)
    private documentsRepository: Repository<Documents>,
    @InjectRepository(Tokens)
    private tokensRepository: Repository<Tokens>,
    private dataSource: DataSource
  ) {}

  async get(id: number, version: number): Promise<TTokenizeResult[]> {
    const document = await this.documentsRepository.findOne({
      where: { id }
    })

    if (!document) {
      throw new Error('Document not found')
    }

    // Весь документ читается одним запросом; порядок узлов задаёт position.
    const tokens = await this.tokensRepository.find({
      where: { document: { id }, version },
      order: { position: 'ASC' }
    })

    if (!tokens.length) {
      throw new Error('Document not found')
    }

    return buildTreeFromFlat(tokens)
  }

  /** Пакетно сохраняет плоский список узлов: предки раньше потомков, без N+1 на узел. */
  private async persistTokens(
    rows: FlatToken[],
    document: Documents,
    version: number,
    manager: EntityManager
  ): Promise<void> {
    const entityById = new Map<number, Tokens>()

    for (const row of rows) {
      const token = new Tokens()

      token.name = row.name
      token.value = row.value
      token.hash = MurmurHash3(row.value).result().toString(16)
      token.version = version
      token.document = document
      token.relation = row.relation
      token.position = row.position
      token.level = row.level

      entityById.set(row.id, token)
    }

    // Пакетная многострочная вставка поколение за поколением: у каждого
    // потомка родитель уже вставлен и получил id. Запросов O(глубины), а не
    // по одному на узел. Поколение дробится на чанки, чтобы не упереться в
    // лимит пакета MySQL на очень крупных документах.
    const CHUNK = 500

    for (const generation of groupByGeneration(rows)) {
      const batch = generation.map((row) => {
        const token = entityById.get(row.id)

        token.parentId =
          row.parentId != null ? entityById.get(row.parentId).id : null

        return token
      })

      for (let i = 0; i < batch.length; i += CHUNK) {
        await manager.insert(Tokens, batch.slice(i, i + CHUNK))
      }
    }
  }

  async create(
    projectId: number,
    data: { name: string; value: string; parser: string }
  ): Promise<Documents> {
    const project = await this.projectsRepository.findOne({
      where: {
        id: projectId
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const document = new Documents()

    document.name = data.name
    document.branch = 'master'
    document.latestVersion = 1
    document.project = project

    document.hash = MurmurHash3(data.value).result().toString(16)

    const duplicate = await this.documentsRepository.findOne({
      where: {
        hash: document.hash,
        project: project
      }
    })

    if (duplicate) {
      throw new Error('Document already exists')
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(document)

      const tokenizer = new html().init()
      const tree = tokenizer.tokenize(unescape(data.value))
      const rows = flattenTree(tree)

      await this.persistTokens(rows, document, 1, manager)
    })

    return document
  }
}
