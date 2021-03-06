const { Task, User, Team } = require('../models');
const { validationResult } = require('express-validator');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const moment = require('moment');

module.exports = {
    
    index: async (req, res) => {
        try {
            let result;
            const { user } = req;
            let { limit = 7, page = 1 } = req.query;
            limit = parseInt(limit);
            page = parseInt(page) - 1;
            
            if (user.admin) {
                const teams = await User.findAll({
                    include: [
                        {
                            model: Team,
                            as: 'team_users',
                            required: true,
                            where: {
                                manager:user.user_id
                            }
                        }
                    ],
                });
                
                const usersIds = teams.map(user => user.id);
                
                const {count:size, rows:tasks} = await Task.findAndCountAll({
                    include: [
                        {
                            model: User,
                            as: 'users_task',
                            required:true
                        }
                    ],
                    where: {
                        users_id:{[Op.in]:usersIds}
                    },
                    limit,
                    offset:limit*page
                });

                result = {size, tasks};

            } else {
                let {count:size, rows:tasks} = await Task.findAndCountAll({
                    include: [
                        {
                            model: User,
                            as: 'users_task',
                            required:true
                        }
                    ],
                    where: {
                        users_id: user.user_id
                    },
                    limit,
                    offset:limit*page
                });

                result = {size, tasks};

            }
            
            return res.status(200).json(result);
            
        } catch (error) {
          console.error(error.message);
            return res.status(501).json({ error:error.message });
        }
    },
    
    store: async (req, res) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(422).json({ errors: errors.array() });
            }

            const { start_at, description } = req.body;
            const { user_id } = req.user;
            let formatedDate = moment(start_at).format('YYYY-MM-DD hh:mm:ss');
            const result = await Task.create({ start_at:formatedDate, description, users_id: user_id });
            return res.status(200).json({ result });
        } catch (error) {
            console.error(error.message);
            return res.status(501).json({ error:error.message });
        }
    },
    
    update: async (req, res) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(422).json({ errors: errors.array() });
            }

            const { start_at, description, done, done_at } = req.body;
            const { id } = req.params;
            const { user_id } = req.user;

            const task = await Task.findByPk(id);
            if (!task) {
                return res.status(422).json({ error:`Não foi encontrada a tarefa para o id: ${id}` });  
            }
            
            if (task.users_id != user_id) {
                return res.status(422).json({ error:`Você não tem autorização para alterar esta tarefa` }); 
            }
            let formatedDate = moment(start_at).format('YYYY-MM-DD hh:mm:ss');
            task.description = description;
            task.start_at = formatedDate;
            task.done = done;
            task.done_at = done_at;
            const result = await task.save();
            
            return res.status(200).json({ result });
            
        } catch (error) {
           console.error(error.message);
            return res.status(501).json({ error:error.message });
        }
    },
    
    delete: async (req, res) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(422).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { user_id } = req.user;
            
            const task = await Task.findByPk(id);
            if (!task) {
                return res.status(422).json({ error:`Não foi encontrada a tarefa para o id: ${id}` });  
            }
            
            if (task.users_id != user_id) {
                return res.status(422).json({ error:`Você não tem autorização para alterar esta tarefa` }); 
            }
            
            const result = await task.destroy();
            return res.status(200).json({ result });
            
        } catch (error) {
           console.error(error.message);
            return res.status(501).json({ error:error.message });
        }
    },
    
    show: async (req, res) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(422).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { user } = req;
            let restriction = user.user_id;
            let ids;
            if (user.admin) {
                const teams = await User.findAll({
                    include: [
                        {
                            model: Team,
                            as: 'team_users',
                            required: true,
                            where: {
                                manager: user.user_id
                            }
                        }
                    ],
                    
                });
                
                ids = teams.map(user => user.id);
                restriction = { [Op.in]: ids };
            }

            const task = await Task.findOne({
                include: [
                    {
                        model: User,
                        as: 'users_task',
                        required:true
                    }
                ],
                where: {
                    id,
                    users_id: restriction,
                }
            });
            
            if (!task) {
                return res.status(401).json({ error:'Não encontrada ou sem acesso à tarefa' }); 
            }
            
            return res.status(200).json({ task });
            
        } catch (error) {
            console.error(error.message);
            return res.status(501).json({ error:error.message }); 
        }
    }
    
};