interface Configuration {
    slapshot: string,
    theme: string,
    title: string,
    subtitle: string,
    showTime: boolean,
    showDate: boolean,
    showFooter: boolean,
}

type MetadataMap<T> = Dict<string, T>

interface Window {
    CONFIG: Configuration
}

interface AnyEntity extends Entity<any> {
    entity_id: string,
    state: string,
    attributes: any,
}

interface Entity<TAttributes> {
    entity_id: string,
    state: string,
    attributes: TAttributes,
}
  