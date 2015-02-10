/**
 * @jsx React.DOM
 */

var React = require('react');
var Panel = require('react-bootstrap/Panel');
var InputArea = require('./InputArea');

module.exports = React.createClass({

  render: function() {

    return (
      <div className={"row"}>
        <div className={"col-md-1"}></div>
        <div className="col-md-5">
          <Panel>
            <InputArea {...this.props} />
          </Panel>
        </div>
        <div className="col-md-5">
          <Panel>
            Basic panel example
          </Panel>
        </div>
      </div>
    );
  }
});