import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const { income, outcome } = transactions.reduce(
      (previous, current) => {
        if (current.type === 'income') {
          previous.income += current.value;
        } else {
          previous.outcome += current.value;
        }
        return previous;
      },
      {
        income: 0,
        outcome: 0,
      },
    );
    const balance = { income, outcome, total: income - outcome };
    return balance;
  }
}

export default TransactionsRepository;
