// FlashList needs real layout; a FlatList that renders every row has the API surface we use.
const React = require('react');
const { FlatList } = require('react-native');

function FlashList(props) {
  return React.createElement(FlatList, { ...props, initialNumToRender: 500, windowSize: 500 });
}

module.exports = { FlashList };
