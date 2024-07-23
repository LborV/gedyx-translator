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

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Projects)
    private projectsRepository: Repository<Projects>,
    @InjectRepository(Documents)
    private documentsRepository: Repository<Documents>,
    @InjectRepository(Tokens)
    private tokensRepository: Repository<Tokens>
  ) {}

  private async getTokenWithChild(id: number): Promise<Tokens> {
    const token = await this.tokensRepository.findOne({
      relations: ['children', 'closeToken', 'subTokens'],
      where: {
        id: id
      }
    })

    if (!token) {
      throw new Error('Token not found')
    }

    const children = []
    const subTokens = []
    let closeToken = null

    for (const child in token.children) {
      const childToken = await this.getTokenWithChild(token.children[child].id)

      children.push(childToken)
    }

    for (const subToken in token.subTokens) {
      const subTokenData = await this.getTokenWithChild(
        token.subTokens[subToken].id
      )

      subTokens.push(subTokenData)
    }

    if (token.closeToken) {
      closeToken = await this.getTokenWithChild(token.closeToken.id)
    }

    token.children = children
    token.closeToken = closeToken

    return token
  }

  async get(id: number, version: number): Promise<Tokens[]> {
    const document = await this.documentsRepository.findOne({
      where: {
        id: id
      }
    })

    if (!document) {
      throw new Error('Document not found')
    }

    const coreToken = await this.tokensRepository.findOne({
      relations: ['children'],
      where: {
        document: document,
        version: version,
        level: 0,
        name: 'core'
      }
    })

    if (!coreToken) {
      throw new Error('Document not found')
    }

    const childTokens = []

    for (const child of coreToken.children) {
      childTokens.push(await this.getTokenWithChild(child.id))
    }

    coreToken.children = childTokens

    return [coreToken]
  }

  private async saveToken(
    tokenData: TTokenizeResult,
    document: Documents,
    level: number = 1
  ): Promise<Tokens> {
    const token = new Tokens()

    token.name = tokenData.name
    token.value = JSON.stringify(tokenData.value)
    token.hash = MurmurHash3(tokenData.value).result().toString(16)
    token.version = 1
    token.document = document
    token.children = []
    token.subTokens = []
    token.level = level

    if (tokenData.closeToken) {
      const closeToken = await this.saveToken(
        tokenData.closeToken,
        document,
        level
      )

      token.closeToken = closeToken
    }

    if (tokenData.childs.length) {
      for (const child of tokenData.childs) {
        const childToken = await this.saveToken(child, document, level + 1)

        token.children.push(childToken)
      }
    }

    if (tokenData.subTokens && Object.keys(tokenData.subTokens).length) {
      for (const subTokensGroup of Object.values(tokenData.subTokens)) {
        for (const subToken of subTokensGroup) {
          const subTokenData = await this.saveToken(subToken, document, level)

          token.subTokens.push(subTokenData)
        }
      }
    }

    return this.tokensRepository.save(token)
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

    await this.documentsRepository.save(document)

    const tokenizer = new html().init()
    const tokens = tokenizer.tokenize(unescape(data.value))

    const coreToken = new Tokens()

    coreToken.name = 'core'
    coreToken.level = 0
    coreToken.children = []
    coreToken.document = document
    coreToken.value = ''
    coreToken.version = 1
    coreToken.hash = document.hash

    await Promise.all(
      tokens.map(async (token) => {
        coreToken.children.push(await this.saveToken(token, document))
      })
    )

    this.tokensRepository.save(coreToken)

    return document
  }
}
