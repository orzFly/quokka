export interface BaserowFile {
  url: string
  thumbnails?: {
    tiny: { url: string; width: number; height: number }
    small: { url: string; width: number; height: number }
    card_cover: { url: string; width: number; height: number }
  }
  image_width?: number
  image_height?: number
  name: string
}

export type BaserowFilterGroup<F extends number | string> =
  | { filter_type: 'AND'; filters?: BaserowFilter<F>[]; groups?: BaserowFilterGroup<F>[] }
  | { filter_type: 'OR'; filters?: BaserowFilter<F>[]; groups?: BaserowFilterGroup<F>[] }

export type BaserowFilter<F extends number | string> =
  | { field: F; type: 'equal'; value: any }
  | { field: F; type: 'not_equal'; value: any }
  | { field: F; type: 'contains'; value: any }
  | { field: F; type: 'not_contains'; value: any }
  | { field: F; type: 'higher_than'; value: any }
  | { field: F; type: 'higher_than_or_equal'; value: any }
  | { field: F; type: 'lower_than'; value: any }
  | { field: F; type: 'lower_than_or_equal'; value: any }
  | { field: F; type: 'link_row_has'; value: any }
  | { field: F; type: 'link_row_has_not'; value: any }
  | { field: F; type: 'link_row_contains'; value: any }
  | { field: F; type: 'link_row_contains_not'; value: any }

export class BaserowInstance {
  public constructor(
    public readonly backend: string,
    public readonly header: Record<string, string>,
  ) {
    if (this.backend.endsWith('/')) {
      this.backend = this.backend.slice(0, -1)
    }
  }
}

export class BaserowTable<T extends Record<string, any>> {
  public constructor(
    public readonly instance: BaserowInstance,
    public readonly tableId: number,
    public readonly fieldMap: Record<keyof T, number>,
  ) {}

  public readonly recordType = null as unknown as BaserowRecord<T>

  private convertFilter(filter: BaserowFilter<Extract<keyof T, string>>): BaserowFilter<number> {
    if (typeof filter.field === 'object' || typeof filter.field === 'number') {
      return { field: filter.field as any, type: filter.type, value: filter.value }
    }
    const f = this.fieldMap[filter.field]
    return { field: f, type: filter.type, value: filter.value }
  }

  private convertFilterGroup(group: BaserowFilterGroup<Extract<keyof T, string>>): BaserowFilterGroup<number> {
    return {
      ...group,
      filters: group.filters?.map((f) => this.convertFilter(f)),
      groups: group.groups?.map((g) => this.convertFilterGroup(g)),
    }
  }

  public async list(
    options: {
      page?: number
      size?: number
      filters?: BaserowFilter<Extract<keyof T, string>>[]
      filterGroups?: BaserowFilterGroup<Extract<keyof T, string>>[]
      join?: {
        field: keyof T
        target: ReturnType<typeof joinTarget<any>>
      }[]
    } = {},
  ): Promise<{
    count: number
    next: string | null
    previous: string | null
    results: BaserowRecord<T>[]
  }> {
    const params = {
      page: (options.page ?? 1).toString(),
      size: (options.size ?? 10).toString(),
      ...(options.filters || options.filterGroups
        ? {
            filters: JSON.stringify({
              filter_type: 'AND',
              filters: (options.filters ?? []).map((f) => this.convertFilter(f)),
              groups: (options.filterGroups ?? []).map((g) => this.convertFilterGroup(g)),
            }),
          }
        : {}),
      ...(options.join
        ? Object.fromEntries(
            options.join.map((j) => [
              `field_${this.fieldMap[j.field]}__join`,
              j.target.fields.map((f) => `field_${j.target.table.fieldMap[f]}`).join(','),
            ]),
          )
        : {}),
    } satisfies Record<string, string>

    const response = await fetch(
      `${this.instance.backend}/database/rows/table/${this.tableId}/?${new URLSearchParams(params)}`,
      {
        headers: this.instance.header,
      },
    )
    if (!response.ok) {
      console.log(await response.text())
      throw new Error(`Failed to fetch records: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results.map((record: any) => new BaserowRecord(this.instance, this, record)),
    }
  }

  public async get(id: number): Promise<BaserowRecord<T>> {
    const response = await fetch(`${this.instance.backend}/database/rows/table/${this.tableId}/${id}/`, {
      headers: this.instance.header,
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch record ${id}: ${response.statusText}`)
    }
    return new BaserowRecord(this.instance, this, await response.json())
  }

  public async create(record: Partial<T>): Promise<BaserowRecord<T>> {
    const body = JSON.stringify(
      Object.fromEntries(
        Object.entries(record).map(([key, value]) => [`field_${this.fieldMap[key as keyof T]}`, value]),
      ),
    )
    const response = await fetch(`${this.instance.backend}/database/rows/table/${this.tableId}/`, {
      method: 'POST',
      headers: {
        ...this.instance.header,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: body,
    })
    if (!response.ok) {
      throw new Error(`Failed to create record: ${response.statusText}`)
    }
    return new BaserowRecord(this.instance, this, await response.json())
  }

  public async patch(id: number, patch: Partial<T>): Promise<BaserowRecord<T>> {
    const body = JSON.stringify(
      Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [`field_${this.fieldMap[key as keyof T]}`, value]),
      ),
    )
    const response = await fetch(`${this.instance.backend}/database/rows/table/${this.tableId}/${id}/`, {
      method: 'PATCH',
      headers: {
        ...this.instance.header,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: body,
    })

    if (!response.ok) {
      throw new Error(`Failed to update record: ${response.statusText}`)
    }
    return new BaserowRecord(this.instance, this, await response.json())
  }

  public async delete(id: number): Promise<void> {
    const response = await fetch(`${this.instance.backend}/database/rows/table/${this.tableId}/${id}/`, {
      method: 'DELETE',
      headers: this.instance.header,
    })
    if (!response.ok) {
      throw new Error(`Failed to delete record: ${response.statusText}`)
    }
  }

  public parse(record: Record<string, any>): BaserowRecord<T> {
    return new BaserowRecord(this.instance, this, record as any)
  }
}

export class BaserowRecord<T extends Record<string, any>> {
  public constructor(
    public readonly instance: BaserowInstance,
    public readonly table: BaserowTable<T>,
    public readonly record: {
      id: number
      order: string
    } & Record<string, any>,
  ) {}

  public get id(): number {
    return this.record.id
  }

  public get<K extends keyof T>(key: K): T[K] {
    return this.record[`field_${this.table.fieldMap[key]}`] as T[K]
  }

  public toJSON(): T {
    return Object.entries(this.table.fieldMap).reduce(
      (acc, [key, value]) => {
        acc[key] = this.record[`field_${value}`]
        return acc
      },
      {} as Record<string, any>,
    ) as T
  }

  public async update(patch: Partial<T>): Promise<BaserowRecord<T>> {
    return this.table.patch(this.id, patch)
  }

  public async delete(): Promise<void> {
    return this.table.delete(this.id)
  }
}

export function joinTarget<T extends Record<string, any>>(
  table: BaserowTable<T>,
  fields: (keyof T)[],
): { table: BaserowTable<T>; fields: (keyof T)[] } {
  return {
    table,
    fields,
  }
}
