export const ROUTE_PATH = {
    AUTH:{
        LOGIN:'/login',
        REGISTER:'/register',
        LOGOUT :'/logout'
    },
    EMPLOYER:{
        HOME:'/employer/home',
        PROFILE:'/employer/profile',
        JOBS:'/employer/jobs',
        JOB_NEW:'/employer/jobs/new',
        JOB_DETAIL:'/employer/jobs/:id',
        JOB_EDIT:'/employer/jobs/:id/edit',
        JOB_REPOST:'/employer/jobs/:id/repost'
    },
    ADMIN:{
        LOGIN:'/admin/login',
        EMPLOYERS:'/admin/employers'
    },
    FINDER:{
        HOME:'/finder/home',
        PROFILE:'/finder/profile',
        APPLICATIONS:'/finder/applications',
        JOBS:'/jobs', //công khai, cả khách
        JOB_DETAIL:'/jobs/:id' //công khai
    }

}