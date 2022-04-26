import SQLiteParserListener from './SQLiteParserListener.js'
import {SQLiteParser} from "./SQLiteParser.js";
import {default as antlr4} from 'antlr4';

export class CustomListener extends SQLiteParserListener {
  constructor(result) {
    super();
    this.result = result;
    this.selectStruct = null;
  }

  buildSelect() {
    return {
      columns: [],
      table: [],
      conditions: [],
	  range: null,
      groupby: null,
      orderby: null,
	  not: false
    };
  }

	// Enter a parse tree produced by SQLiteParser#parse.
	enterParse(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#parse.
	exitParse(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#sql_stmt_list.
	enterSql_stmt_list(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#sql_stmt_list.
	exitSql_stmt_list(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#sql_stmt.
	enterSql_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#sql_stmt.
	exitSql_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#indexed_column.
	enterIndexed_column(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#indexed_column.
	exitIndexed_column(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#column_def.
	enterColumn_def(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#column_def.
	exitColumn_def(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#type_name.
	enterType_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#type_name.
	exitType_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#column_constraint.
	enterColumn_constraint(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#column_constraint.
	exitColumn_constraint(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#signed_number.
	enterSigned_number(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#signed_number.
	exitSigned_number(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#table_constraint.
	enterTable_constraint(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#table_constraint.
	exitTable_constraint(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#foreign_key_clause.
	enterForeign_key_clause(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#foreign_key_clause.
	exitForeign_key_clause(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#conflict_clause.
	enterConflict_clause(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#conflict_clause.
	exitConflict_clause(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#with_clause.
	enterWith_clause(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#with_clause.
	exitWith_clause(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#cte_table_name.
	enterCte_table_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#cte_table_name.
	exitCte_table_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#recursive_cte.
	enterRecursive_cte(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#recursive_cte.
	exitRecursive_cte(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#common_table_expression.
	enterCommon_table_expression(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#common_table_expression.
	exitCommon_table_expression(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#delete_stmt.
	enterDelete_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#delete_stmt.
	exitDelete_stmt(ctx) {
	}

	enterExpr_invertOp(op) {
		if(!this.selectStruct.not)
			return op;
		if (op !== '.')
			this.selectStruct.not = false;
		switch(op) {
			case '=':
				return '!=';
			case '<>', '!=':
				return '=';
			case '>':
				return '<=';
			case '<':
				return '>=';
			case '>=':
				return '<';
			case '<=':
				return '>';
			default:
				return op;
		}
	}

	enterExpr_terminalNode(child) {
		var op = this.enterExpr_invertOp(child.getText());

		switch(op) {
			case '=': case 'IS':
				return '===';
			case '<>': case 'IS NOT':
				return '!==';
			case 'AND':
				return '&&';
			case 'OR':
				return '||';
			default:
				return op;
		}
	}

	enterExpr_exprContext(child) {
		if(child.constructor.name === 'ExprContext') {
			this.enterExpr_recursiveChildren(child.children)
		} else {
			return child.getText()
		}
	}

	enterExpr_recursiveChildren(children) {
		var custom_column = []
		var interval = null
		children.forEach(child => {
			switch (child.constructor.name) {
			case 'Table_nameContext':
				custom_column.push(child.getText())
				break;
			case 'Column_nameContext':
				custom_column.push(child.getText())
				this.selectStruct.conditions.push(custom_column.join(''))
				custom_column = []
				break;
			case 'TerminalNodeImpl':
				var terminal = this.enterExpr_terminalNode(child)
				if (custom_column.length === 0) {
					if(this.selectStruct.range) {
						this.selectStruct.range.push(terminal)
					} else {
						this.selectStruct.conditions.push(terminal)
					}
				} else {
					custom_column.push(terminal)
				}
				if (terminal === 'IN' || terminal === 'NOT IN') {
					this.selectStruct.range = []
				}
				if (terminal === ')' && this.selectStruct.range) {
					var op = this.selectStruct.conditions.pop()
					var name = this.selectStruct.conditions.pop()
					if(name === 'NOT') {
						name = this.selectStruct.conditions.pop()
						op = 'NOT IN'
					}
					this.selectStruct.range.shift(); this.selectStruct.range.pop() // remove parenthesis
					var command = `[${this.selectStruct.range.join('')}].includes(${name})`
					if (op === 'NOT IN') {
						command = `!(${command})`
					}
					this.selectStruct.conditions.push(command)
					this.selectStruct.range = null
				}
				break;
			case 'Unary_operatorContext':
				if(child.getText() === 'NOT') {
					this.selectStruct.not = true;
				}
				break;
			default:
				var expr = this.enterExpr_exprContext(child);
				if(expr) {
					if(this.selectStruct.range) {
						this.selectStruct.range.push(expr)
					} else {
						this.selectStruct.conditions.push(expr)
					}
				}
				break;
			}
		})
	}

	// Enter a parse tree produced by SQLiteParser#expr.
	enterExpr(ctx) {
		if(this.selectStruct && this.selectStruct.conditions.length == 0 && ctx.children.length > 2) {
			this.enterExpr_recursiveChildren(ctx.children)
		}
	}

	// Exit a parse tree produced by SQLiteParser#expr.
	exitExpr(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#raise_function.
	enterRaise_function(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#raise_function.
	exitRaise_function(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#literal_value.
	enterLiteral_value(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#literal_value.
	exitLiteral_value(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#insert_stmt.
	enterInsert_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#insert_stmt.
	exitInsert_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#upsert_clause.
	enterUpsert_clause(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#upsert_clause.
	exitUpsert_clause(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#pragma_stmt.
	enterPragma_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#pragma_stmt.
	exitPragma_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#pragma_value.
	enterPragma_value(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#pragma_value.
	exitPragma_value(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#reindex_stmt.
	enterReindex_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#reindex_stmt.
	exitReindex_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#select_stmt.
	enterSelect_stmt(ctx) {
    this.selectStruct = this.buildSelect();
	}

	// Exit a parse tree produced by SQLiteParser#select_stmt.
	exitSelect_stmt(ctx) {
    if (this.selectStruct) {
      var sql = [];
	  if(this.selectStruct.orderby) {
		  var order = this.selectStruct.orderby.pop()
		  sql.push(`, orderBy('${this.selectStruct.orderby.join(",")}', '${order.toLowerCase()}' `)
	  }
      if(this.selectStruct.table) {
        sql.push(", from('" + this.selectStruct.table.join(","))
        if(this.selectStruct.conditions.length > 0) {
        	sql.push(`', { where: "${this.selectStruct.conditions.join(' ')}"})`);
        } else {
			sql.push("'");
		}
        sql.push(")");
      }
	  if(this.selectStruct.orderby) {
		  sql.push(")")
	  }
      this.result.push(`select('${this.selectStruct.columns.join(",")}'${sql.join('')})`);
      this.selectStruct = null;
    }
	}


	// Enter a parse tree produced by SQLiteParser#join_clause.
	enterJoin_clause(ctx) {
		console.log("enterJoin_clause");
		this.result.push("innerJoin(");
	}

	// Exit a parse tree produced by SQLiteParser#join_clause.
	exitJoin_clause(ctx) {
		console.log("exitJoin_clause");
		this.result.push(")");
	}


	// Enter a parse tree produced by SQLiteParser#select_core.
	enterSelect_core(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#select_core.
	exitSelect_core(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#factored_select_stmt.
	enterFactored_select_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#factored_select_stmt.
	exitFactored_select_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#simple_select_stmt.
	enterSimple_select_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#simple_select_stmt.
	exitSimple_select_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#compound_select_stmt.
	enterCompound_select_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#compound_select_stmt.
	exitCompound_select_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#table_or_subquery.
	enterTable_or_subquery(ctx) {
		if(this.selectStruct) {
			this.selectStruct.table.push(ctx.getText())
		}
	}

	// Exit a parse tree produced by SQLiteParser#table_or_subquery.
	exitTable_or_subquery(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#result_column.
	enterResult_column(ctx) {
		if(this.selectStruct) {
			this.selectStruct.columns.push(ctx.getText());
		}
	}

	// Exit a parse tree produced by SQLiteParser#result_column.
	exitResult_column(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#join_operator.
	enterJoin_operator(ctx) {
		console.log("enterJoin_operator");
		console.log(ctx.getText());
	}

	// Exit a parse tree produced by SQLiteParser#join_operator.
	exitJoin_operator(ctx) {
    	console.log("exitJoin_operator");	
	}


	// Enter a parse tree produced by SQLiteParser#join_constraint.
	enterJoin_constraint(ctx) {
		console.log("enterJoin_constraint");
		console.log(ctx.getText());
  }

	// Exit a parse tree produced by SQLiteParser#join_constraint.
	exitJoin_constraint(ctx) {
		console.log("exitJoin_constraint");
	}


	// Enter a parse tree produced by SQLiteParser#compound_operator.
	enterCompound_operator(ctx) {
		console.log("enterCompound_operator");
		console.log(ctx.getText());
	}

	// Exit a parse tree produced by SQLiteParser#compound_operator.
	exitCompound_operator(ctx) {
		console.log("exitCompound_operator");
	}


	// Enter a parse tree produced by SQLiteParser#update_stmt.
	enterUpdate_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#update_stmt.
	exitUpdate_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#column_name_list.
	enterColumn_name_list(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#column_name_list.
	exitColumn_name_list(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#update_stmt_limited.
	enterUpdate_stmt_limited(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#update_stmt_limited.
	exitUpdate_stmt_limited(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#qualified_table_name.
	enterQualified_table_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#qualified_table_name.
	exitQualified_table_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#vacuum_stmt.
	enterVacuum_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#vacuum_stmt.
	exitVacuum_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#filter_clause.
	enterFilter_clause(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#filter_clause.
	exitFilter_clause(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#window_defn.
	enterWindow_defn(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#window_defn.
	exitWindow_defn(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#over_clause.
	enterOver_clause(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#over_clause.
	exitOver_clause(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#frame_spec.
	enterFrame_spec(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#frame_spec.
	exitFrame_spec(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#frame_clause.
	enterFrame_clause(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#frame_clause.
	exitFrame_clause(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#simple_function_invocation.
	enterSimple_function_invocation(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#simple_function_invocation.
	exitSimple_function_invocation(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#aggregate_function_invocation.
	enterAggregate_function_invocation(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#aggregate_function_invocation.
	exitAggregate_function_invocation(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#window_function_invocation.
	enterWindow_function_invocation(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#window_function_invocation.
	exitWindow_function_invocation(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#common_table_stmt.
	enterCommon_table_stmt(ctx) {
		console.log("enterCommon_table_stmt");
		console.log(ctx.getText());
	}

	// Exit a parse tree produced by SQLiteParser#common_table_stmt.
	exitCommon_table_stmt(ctx) {
		console.log("exitCommon_table_stmt");
	}


	// Enter a parse tree produced by SQLiteParser#order_by_stmt.
	enterOrder_by_stmt(ctx) {
		this.selectStruct.orderby = []
		ctx.children.forEach(child => {
			if(child.constructor.name === 'Ordering_termContext') {
				child.children.forEach(child => {
					this.selectStruct.orderby.push(child.getText());
				})
			}
		})
		var lastElem = this.selectStruct.orderby[this.selectStruct.orderby.length - 1];
		console.log(lastElem)
		if(lastElem !== 'ASC' && lastElem !== 'DESC') {
			this.selectStruct.orderby.push('ASC')
		}
	}

	// Exit a parse tree produced by SQLiteParser#order_by_stmt.
	exitOrder_by_stmt(ctx) {
		console.log("exitOrder_by_stmt");
	}


	// Enter a parse tree produced by SQLiteParser#limit_stmt.
	enterLimit_stmt(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#limit_stmt.
	exitLimit_stmt(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#ordering_term.
	enterOrdering_term(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#ordering_term.
	exitOrdering_term(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#asc_desc.
	enterAsc_desc(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#asc_desc.
	exitAsc_desc(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#frame_left.
	enterFrame_left(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#frame_left.
	exitFrame_left(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#frame_right.
	enterFrame_right(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#frame_right.
	exitFrame_right(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#frame_single.
	enterFrame_single(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#frame_single.
	exitFrame_single(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#window_function.
	enterWindow_function(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#window_function.
	exitWindow_function(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#of_OF_fset.
	enterOf_OF_fset(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#of_OF_fset.
	exitOf_OF_fset(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#default_DEFAULT__value.
	enterDefault_DEFAULT__value(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#default_DEFAULT__value.
	exitDefault_DEFAULT__value(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#partition_by.
	enterPartition_by(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#partition_by.
	exitPartition_by(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#order_by_expr.
	enterOrder_by_expr(ctx) {
		console.log("enterOrder_by_expr");
	}

	// Exit a parse tree produced by SQLiteParser#order_by_expr.
	exitOrder_by_expr(ctx) {
		console.log("exitOrder_by_expr");
	}

	// Enter a parse tree produced by SQLiteParser#order_by_expr_asc_desc.
	enterOrder_by_expr_asc_desc(ctx) {
		console.log("enterOrder_by_expr_asc_desc");
	}

	// Exit a parse tree produced by SQLiteParser#order_by_expr_asc_desc.
	exitOrder_by_expr_asc_desc(ctx) {
		console.log("exitOrder_by_expr_asc_desc");
	}


	// Enter a parse tree produced by SQLiteParser#expr_asc_desc.
	enterExpr_asc_desc(ctx) {
		console.log("enterExpr_asc_desc");
	}

	// Exit a parse tree produced by SQLiteParser#expr_asc_desc.
	exitExpr_asc_desc(ctx) {
		console.log("exitExpr_asc_desc");
	}


	// Enter a parse tree produced by SQLiteParser#initial_select.
	enterInitial_select(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#initial_select.
	exitInitial_select(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#recursive__select.
	enterRecursive__select(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#recursive__select.
	exitRecursive__select(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#unary_operator.
	enterUnary_operator(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#unary_operator.
	exitUnary_operator(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#error_message.
	enterError_message(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#error_message.
	exitError_message(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#module_argument.
	enterModule_argument(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#module_argument.
	exitModule_argument(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#column_alias.
	enterColumn_alias(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#column_alias.
	exitColumn_alias(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#keyword.
	enterKeyword(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#keyword.
	exitKeyword(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#name.
	enterName(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#name.
	exitName(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#function_name.
	enterFunction_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#function_name.
	exitFunction_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#schema_name.
	enterSchema_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#schema_name.
	exitSchema_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#table_name.
	enterTable_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#table_name.
	exitTable_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#table_or_index_name.
	enterTable_or_index_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#table_or_index_name.
	exitTable_or_index_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#new_table_name.
	enterNew_table_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#new_table_name.
	exitNew_table_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#column_name.
	enterColumn_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#column_name.
	exitColumn_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#collation_name.
	enterCollation_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#collation_name.
	exitCollation_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#foreign_table.
	enterForeign_table(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#foreign_table.
	exitForeign_table(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#index_name.
	enterIndex_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#index_name.
	exitIndex_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#trigger_name.
	enterTrigger_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#trigger_name.
	exitTrigger_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#view_name.
	enterView_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#view_name.
	exitView_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#module_name.
	enterModule_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#module_name.
	exitModule_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#pragma_name.
	enterPragma_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#pragma_name.
	exitPragma_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#savepoint_name.
	enterSavepoint_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#savepoint_name.
	exitSavepoint_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#table_alias.
	enterTable_alias(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#table_alias.
	exitTable_alias(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#transaction_name.
	enterTransaction_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#transaction_name.
	exitTransaction_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#window_name.
	enterWindow_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#window_name.
	exitWindow_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#alias.
	enterAlias(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#alias.
	exitAlias(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#filename.
	enterFilename(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#filename.
	exitFilename(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#base_window_name.
	enterBase_window_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#base_window_name.
	exitBase_window_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#simple_func.
	enterSimple_func(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#simple_func.
	exitSimple_func(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#aggregate_func.
	enterAggregate_func(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#aggregate_func.
	exitAggregate_func(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#table_function_name.
	enterTable_function_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#table_function_name.
	exitTable_function_name(ctx) {
	}


	// Enter a parse tree produced by SQLiteParser#any_name.
	enterAny_name(ctx) {
	}

	// Exit a parse tree produced by SQLiteParser#any_name.
	exitAny_name(ctx) {
  }

}