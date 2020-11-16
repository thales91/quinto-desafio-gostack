import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Category from '../models/Category';

import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);
    const balance = await transactionRepository.getBalance();

    let categoryItem = await categoryRepository.findOne({
      where: { title: category },
    });

    if (type === 'outcome' && balance.total < value) {
      throw new AppError('voce não tem saldo');
    }

    if (!categoryItem) {
      const categoryNew = categoryRepository.create({ title: category });
      await categoryRepository.save(categoryNew);
      categoryItem = categoryNew;
    }
    const transactionNew = transactionRepository.create({
      title,
      value,
      type,
      category_id: categoryItem.id,
      category: categoryItem,
    });
    await transactionRepository.save(transactionNew);
    return transactionNew;
  }
}

export default CreateTransactionService;
