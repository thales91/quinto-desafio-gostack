import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import { getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface Request {
  csvFilename: string;
}

class ImportTransactionsService {
  async execute({ csvFilename }: Request): Promise<Transaction[]> {
    const csvFilePath = path.resolve(__dirname, '..', '..', 'tmp', csvFilename);
    const readCSVStrem = fs.createReadStream(csvFilePath);
    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const parseCSV = readCSVStrem.pipe(parseStream);

    const lines: Array<string[]> = [];
    parseCSV.on('data', (line: string[]) => {
      lines.push(line);
    });
    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });
    const categoryRepository = getRepository(Category);
    const categories = await categoryRepository.find();

    const CategoriesReduce = lines.reduce((categoriesAcumulator, current) => {
      const categoryIndex = categoriesAcumulator.findIndex(
        categoriesItem => categoriesItem === current[3],
      );
      if (categoryIndex < 0) {
        categoriesAcumulator.push(current[3]);
      }

      return categoriesAcumulator;
    }, []);

    const newCategories = CategoriesReduce.map(item => {
      return categoryRepository.create({ title: item });
    });
    await categoryRepository.save(newCategories);

    const transactionRepository = getCustomRepository(TransactionRepository);

    const totalCategories = [...categories, ...newCategories];

    const newTransactions = transactionRepository.create(
      lines.map(item => {
        const categoryIndex = totalCategories.findIndex(
          category => category.title === item[3],
        );
        const categoryItem = totalCategories[categoryIndex];
        return {
          title: item[0],
          value: parseInt(item[2], 16),
          type: item[1] as 'income' | 'outcome',
          category_id: categoryItem.id,
          category: categoryItem,
        };
      }),
    );
    fs.promises.unlink(csvFilePath);
    return transactionRepository.save(newTransactions);
  }
}

export default ImportTransactionsService;
