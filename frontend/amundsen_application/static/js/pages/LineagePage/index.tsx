// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Link } from 'react-router-dom';
import * as DocumentTitle from 'react-document-title';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { RouteComponentProps } from 'react-router';
import * as d3 from 'd3';

import { getColumnLineage, getTableLineage } from 'ducks/lineage/reducer';
import {
  GetColumnLineageRequest,
  GetTableLineageRequest,
} from 'ducks/lineage/types';

import { ResourceType, Lineage } from 'interfaces';

import { getSourceIconClass } from 'config/config-utils';

import { getLoggingParams } from 'utils/logUtils';

import { GlobalState } from 'ducks/rootReducer';
import LoadingSpinner from 'components/LoadingSpinner';
import Breadcrumb from 'components/Breadcrumb';

import LineageGraph from 'components/LineageGraph';

import './styles.scss';

import { getLink } from 'components/ResourceListItem/TableListItem';
import * as Constants from './constants';
// import {logClick} from "../../utils/analytics";

const SERVER_ERROR_CODE = 500;

export interface PropsFromState {
  isLoading: boolean;
  // isLoadingDashboards: boolean;
  // numRelatedDashboards: number;
  statusCode: number | null;
  // tableData: TableMetadata;
  lineageTree: Lineage;
}
export interface DispatchFromProps {
  // getTableData: (
  //   key: string,
  //   searchIndex?: string,
  //   source?: string
  // ) => GetTableDataRequest;
  getTableLineageDispatch: (
    key: string,
    depth?: number,
    direction?: string
  ) => GetTableLineageRequest;
  getColumnLineageDispatch: (
    key: string,
    columnName: string,
    depth?: number,
    direction?: string
  ) => GetColumnLineageRequest;
  // openRequestDescriptionDialog: (
  //   requestMetadataType: RequestMetadataType,
  //   columnName: string
  // ) => OpenRequestAction;
  // searchSchema: (schemaText: string) => UpdateSearchStateRequest;
}

export interface MatchProps {
  cluster: string;
  database: string;
  schema: string;
  table: string;
}

export type LineageProps = PropsFromState &
  DispatchFromProps &
  RouteComponentProps<MatchProps>;

const ErrorMessage = () => (
  <div className="container error-label">
    <Breadcrumb />
    <label>{Constants.ERROR_MESSAGE}</label>
  </div>
);

export class LineagePage extends React.Component<
  LineageProps & RouteComponentProps<any>
> {
  private key: string;

  state: any = {};

  private didComponentMount: boolean = false;

  componentDidMount() {
    const { getTableLineageDispatch } = this.props;
    this.key = this.getTableKey();
    getTableLineageDispatch(this.key, 5);
    this.didComponentMount = true;
  }

  componentDidUpdate() {
    const { getTableLineageDispatch } = this.props;
    const newKey = this.getTableKey();
    if (this.key !== newKey) {
      this.key = newKey;
      getTableLineageDispatch(this.key, 5);
    }
  }

  getDisplayName() {
    const { match } = this.props;
    const { params } = match;

    return `Lineage Information | ${params.schema}.${params.table}`;
  }

  // ToDo: Should be moved to a common place
  getTableKey() {
    /*
    This 'key' is the `table_uri` format described in metadataservice. Because it contains the '/' character,
    we can't pass it as a single URL parameter without encodeURIComponent which makes ugly URLs.
    DO NOT CHANGE
    */
    const { match } = this.props;
    const { params } = match;

    return `${params.database}://${params.cluster}.${params.schema}/${params.table}`;
  }

  render() {
    // const { isLoading, statusCode, tableData } = this.props;
    const { match, lineageTree, statusCode, isLoading } = this.props;
    const { params } = match;
    let innerContent;

    // We want to avoid rendering the previous table's metadata before new data is fetched in componentDidMount
    if (isLoading || !this.didComponentMount) {
      innerContent = <LoadingSpinner />;
    } else if (statusCode === SERVER_ERROR_CODE) {
      innerContent = <ErrorMessage />;
    } else {
      const rootNodeData = {
        parent: '',
        source: params.database,
        key: this.getTableKey(),
        badges: [],
        usage: 0,
        database: params.database,
        schema: params.schema,
        name: params.table,
        cluster: params.cluster,
        level: 0,
      };
      // This will be needed to generate the lineage graph.
      lineageTree.upstream_entities.push(rootNodeData);
      lineageTree.downstream_entities.push(rootNodeData);

      innerContent = (
        <div className="resource-detail-layout lineage-page">
          <header className="resource-header">
            <div className="header-section">
              <span
                className={
                  'icon icon-header ' +
                  getSourceIconClass(rootNodeData.database, ResourceType.table)
                }
              />
            </div>
            <div className="header-section header-title">
              <h1
                className="header-title-text truncated"
                title={`${rootNodeData.schema}.${rootNodeData.name}`}
              >
                {rootNodeData.schema}.{rootNodeData.name}
                <span className="text-secondary lineage-graph-label">
                  Lineage Graph
                </span>
              </h1>
              <div className="body-2">
                <Link
                  className="resource-list-item table-list-item"
                  to={getLink(rootNodeData, 'table-lineage-page')}
                >
                  Back to table details
                </Link>
              </div>
            </div>
            <div className="header-section header-links">
              <Link
                to={getLink(rootNodeData, 'table-lineage-page')}
                className="btn btn-close clear-button icon-header"
              />
            </div>
          </header>
          <div className="graph-container">
            <LineageGraph lineage={lineageTree} />
          </div>
        </div>
      );
    }

    return (
      <DocumentTitle
        title={`${this.getDisplayName()} - Amundsen Table Details`}
      >
        {innerContent}
      </DocumentTitle>
    );
  }
}

export const mapStateToProps = (state: GlobalState) => ({
  isLoading: state.lineage.lineage.status === null,
  // statusCode: state.tableMetadata.statusCode,
  statusCode: state.lineage.lineage.status,
  // tableData: state.tableMetadata.tableData,
  lineageTree: state.lineage.lineage.lineageTree,
  // numRelatedDashboards: state.tableMetadata.dashboards
  //   ? state.tableMetadata.dashboards.dashboards.length
  //   : 0,
  // isLoadingDashboards: state.tableMetadata.dashboards
  //   ? state.tableMetadata.dashboards.isLoading
  //   : true,
});

export const mapDispatchToProps = (dispatch: any) =>
  bindActionCreators(
    {
      // getTableData,
      getTableLineageDispatch: getTableLineage,
      getColumnLineageDispatch: getColumnLineage,
      // openRequestDescriptionDialog,
      // searchSchema: (schemaText: string) =>
      //   updateSearchState({
      //     filters: {
      //       [ResourceType.table]: { schema: schemaText },
      //     },
      //     submitSearch: true,
      //   }),
    },
    dispatch
  );

export default connect<PropsFromState, DispatchFromProps>(
  mapStateToProps,
  mapDispatchToProps
)(LineagePage);