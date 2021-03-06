# Copyright Contributors to the Amundsen project.
# SPDX-License-Identifier: Apache-2.0

import unittest
from http import HTTPStatus

from mock import MagicMock, patch

from search_service import create_app


class SearchFeatureFilterTest(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app(config_module_class='search_service.config.LocalConfig')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.mock_index = 'feature_search_index'
        self.mock_term = 'test'
        self.mock_page_index = 0
        self.mock_search_request = {
            'type': 'AND',
            'filters': {
                'availability': ['db1', 'db2']
            }
        }
        self.url = '/search_feature_filter'

    def tear_down(self) -> None:
        self.app_context.pop()

    @patch('search_service.api.feature.reqparse.RequestParser')
    @patch('search_service.api.base.get_proxy_client')
    def test_post(self, get_proxy: MagicMock, RequestParser: MagicMock) -> None:
        mock_proxy = get_proxy()
        RequestParser().parse_args.return_value = dict(index=self.mock_index,
                                                       page_index=self.mock_page_index,
                                                       query_term=self.mock_term,
                                                       search_request=self.mock_search_request)

        self.app.test_client().post(self.url)
        mock_proxy.fetch_search_results_with_filter.assert_called_with(index=self.mock_index,
                                                                       page_index=self.mock_page_index,
                                                                       query_term=self.mock_term,
                                                                       search_request=self.mock_search_request)

    @patch('search_service.api.feature.reqparse.RequestParser')
    @patch('search_service.api.base.get_proxy_client')
    def test_post_return_400_if_no_search_request(self, get_proxy: MagicMock, RequestParser: MagicMock) -> None:
        RequestParser().parse_args.return_value = dict(index=self.mock_index,
                                                       query_term=self.mock_term)

        response = self.app.test_client().post(self.url)
        self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
