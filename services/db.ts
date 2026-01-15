
import { User, Task } from "../types";

const DB_KEY = "HOLOTASK_PERSISTENT_DB_V2";

export class HoloStore {
  static getUsers(): Record<string, User> {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : {};
  }

  static saveUser(user: User) {
    const users = this.getUsers();
    users[user.username] = user;
    localStorage.setItem(DB_KEY, JSON.stringify(users));
  }

  static login(username: string, apiKey?: string): User {
    const users = this.getUsers();
    const normalizedUsername = username.toLowerCase();
    
    if (users[normalizedUsername]) {
      if (apiKey) {
        users[normalizedUsername].apiKey = apiKey;
        this.saveUser(users[normalizedUsername]);
      }
      return users[normalizedUsername];
    }
    
    const newUser: User = { 
      username: normalizedUsername, 
      tasks: [],
      apiKey: apiKey || "" 
    };
    this.saveUser(newUser);
    return newUser;
  }

  static updateTasks(username: string, tasks: Task[]) {
    const users = this.getUsers();
    const normalizedUsername = username.toLowerCase();
    if (users[normalizedUsername]) {
      users[normalizedUsername].tasks = tasks;
      this.saveUser(users[normalizedUsername]);
    }
  }
}
